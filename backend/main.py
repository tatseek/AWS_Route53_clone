from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
import uuid

# config variables
SECRET_KEY = "route53-clone-secret-key-change-in-prod"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

DATABASE_URL = "sqlite:///./route53.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

app = FastAPI(title="Route53 Clone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# models
class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class HostedZone(Base):
    __tablename__ = "hosted_zones"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    type = Column(String, default="Public")  # Public | Private
    comment = Column(Text, default="")
    record_count = Column(Integer, default=2)  # NS + SOA by default
    created_at = Column(DateTime, default=datetime.utcnow)
    records = relationship("DNSRecord", back_populates="zone", cascade="all, delete-orphan")

class DNSRecord(Base):
    __tablename__ = "dns_records"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    zone_id = Column(String, ForeignKey("hosted_zones.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    ttl = Column(Integer, default=300)
    value = Column(Text, nullable=False)
    routing_policy = Column(String, default="Simple")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    zone = relationship("HostedZone", back_populates="records")

Base.metadata.create_all(bind=engine)

# pydantic schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    username: str
    password: str

class ZoneCreate(BaseModel):
    name: str
    type: Optional[str] = "Public"
    comment: Optional[str] = ""

class ZoneUpdate(BaseModel):
    comment: Optional[str] = None
    type: Optional[str] = None

class ZoneOut(BaseModel):
    id: str
    name: str
    type: str
    comment: str
    record_count: int
    created_at: datetime
    class Config:
        from_attributes = True

class RecordCreate(BaseModel):
    name: str
    type: str
    ttl: Optional[int] = 300
    value: str
    routing_policy: Optional[str] = "Simple"

class RecordUpdate(BaseModel):
    name: Optional[str] = None
    ttl: Optional[int] = None
    value: Optional[str] = None
    routing_policy: Optional[str] = None

class RecordOut(BaseModel):
    id: str
    zone_id: str
    name: str
    type: str
    ttl: int
    value: str
    routing_policy: str
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class PaginatedZones(BaseModel):
    items: List[ZoneOut]
    total: int
    page: int
    page_size: int

class PaginatedRecords(BaseModel):
    items: List[RecordOut]
    total: int
    page: int
    page_size: int

# helpers
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain: str, hashed: str):
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def hash_password(password: str):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def seed_demo_user(db: Session):
    existing = db.query(User).filter(User.username == "admin").first()
    if not existing:
        user = User(username="admin", hashed_password=hash_password("admin123"))
        db.add(user)
        db.commit()

# seed demo user on startup
with SessionLocal() as db:
    seed_demo_user(db)

# auth routes
@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "id": current_user.id}

# hosted zone routes
@app.get("/zones", response_model=PaginatedZones)
def list_zones(
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(HostedZone)
    if search:
        q = q.filter(HostedZone.name.ilike(f"%{search}%"))
    total = q.count()
    items = q.order_by(HostedZone.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}

@app.post("/zones", response_model=ZoneOut, status_code=201)
def create_zone(payload: ZoneCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    name = payload.name if payload.name.endswith(".") else payload.name + "."
    existing = db.query(HostedZone).filter(HostedZone.name == name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Hosted zone already exists")
    zone = HostedZone(name=name, type=payload.type, comment=payload.comment or "")
    db.add(zone)
    db.commit()
    db.refresh(zone)
    # add default NS and SOA records
    ns = DNSRecord(zone_id=zone.id, name=name, type="NS", ttl=172800, value="ns-1.awsdns-1.com.\nns-2.awsdns-2.net.\nns-3.awsdns-3.org.\nns-4.awsdns-4.co.uk.", routing_policy="Simple")
    soa = DNSRecord(zone_id=zone.id, name=name, type="SOA", ttl=900, value=f"ns-1.awsdns-1.com. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400", routing_policy="Simple")
    db.add_all([ns, soa])
    db.commit()
    db.refresh(zone)
    return zone

@app.get("/zones/{zone_id}", response_model=ZoneOut)
def get_zone(zone_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone

@app.patch("/zones/{zone_id}", response_model=ZoneOut)
def update_zone(zone_id: str, payload: ZoneUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    if payload.comment is not None:
        zone.comment = payload.comment
    if payload.type is not None:
        zone.type = payload.type
    db.commit()
    db.refresh(zone)
    return zone

@app.delete("/zones/{zone_id}", status_code=204)
def delete_zone(zone_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    db.delete(zone)
    db.commit()

# dns record routes
@app.get("/zones/{zone_id}/records", response_model=PaginatedRecords)
def list_records(
    zone_id: str,
    search: Optional[str] = None,
    type_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    q = db.query(DNSRecord).filter(DNSRecord.zone_id == zone_id)
    if search:
        q = q.filter(DNSRecord.name.ilike(f"%{search}%"))
    if type_filter:
        q = q.filter(DNSRecord.type == type_filter)
    total = q.count()
    items = q.order_by(DNSRecord.created_at.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}

@app.post("/zones/{zone_id}/records", response_model=RecordOut, status_code=201)
def create_record(zone_id: str, payload: RecordCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    record = DNSRecord(zone_id=zone_id, **payload.model_dump())
    db.add(record)
    zone.record_count = db.query(DNSRecord).filter(DNSRecord.zone_id == zone_id).count() + 1
    db.commit()
    db.refresh(record)
    # update record count
    zone.record_count = db.query(DNSRecord).filter(DNSRecord.zone_id == zone_id).count()
    db.commit()
    return record

@app.get("/zones/{zone_id}/records/{record_id}", response_model=RecordOut)
def get_record(zone_id: str, record_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    record = db.query(DNSRecord).filter(DNSRecord.zone_id == zone_id, DNSRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record

@app.patch("/zones/{zone_id}/records/{record_id}", response_model=RecordOut)
def update_record(zone_id: str, record_id: str, payload: RecordUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    record = db.query(DNSRecord).filter(DNSRecord.zone_id == zone_id, DNSRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(record, field, value)
    record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(record)
    return record

@app.delete("/zones/{zone_id}/records/{record_id}", status_code=204)
def delete_record(zone_id: str, record_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    record = db.query(DNSRecord).filter(DNSRecord.zone_id == zone_id, DNSRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if zone:
        zone.record_count = db.query(DNSRecord).filter(DNSRecord.zone_id == zone_id).count() - 1
    db.commit()
    if zone:
        zone.record_count = db.query(DNSRecord).filter(DNSRecord.zone_id == zone_id).count()
        db.commit()
