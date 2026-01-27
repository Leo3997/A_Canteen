from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class MealRecord(Base):
    __tablename__ = "meal_records"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    image_path = Column(String)
    heatmap_path = Column(String, nullable=True)
    total_waste_rate = Column(Float)
    confidence = Column(Float)
    
    details = relationship("WasteDetail", back_populates="record")

class WasteDetail(Base):
    __tablename__ = "waste_details"
    
    id = Column(Integer, primary_key=True, index=True)
    meal_record_id = Column(Integer, ForeignKey("meal_records.id"))
    food_name = Column(String)
    waste_rate = Column(Float)
    region_name = Column(String)
    
    record = relationship("MealRecord", back_populates="details")
