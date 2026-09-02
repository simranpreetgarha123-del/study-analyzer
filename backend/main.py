from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from database import collection
from bson import ObjectId
import numpy as np

app = FastAPI(
    title="Smart Study Tracker API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StudyRecord(BaseModel):
    date: str
    category: str = Field(min_length=2)
    description: str = Field(min_length=3)
    hours: float = Field(gt=0, le=24)

@app.get("/")
def home():
    return {
        "message": "Smart Study Tracker API is running"
    }

@app.post("/records")
def add_record(record: StudyRecord):
    data = {
        "date": record.date,
        "category": record.category,
        "description": record.description,
        "hours": record.hours
    }
    result = collection.insert_one(data)
    return {
        "message": "Study session added successfully",
        "id": str(result.inserted_id)
    }

@app.get("/records")
def get_records(date: str = None):
    query = {}
    if date:
        query["date"] = date
    records = list(collection.find(query))
    for record in records:
        record["_id"] = str(record["_id"])
    return records

@app.delete("/records/{record_id}")
def delete_record(record_id: str):
    try:
        result = collection.delete_one({
            "_id": ObjectId(record_id)
        })
        if result.deleted_count == 0:
            return {
                "message": "Record not found"
            }
        return {
            "message": "Study session deleted successfully"
        }
    except Exception:
        return {
            "message": "Invalid record ID"
        }

@app.get("/stats")
def get_stats(
    date: str,
    goal: float
):
    records = list(collection.find({"date": date}))
    if len(records) == 0:
        return {
            "daily_goal": float(goal),
            "studied": 0.0,
            "remaining": float(goal),
            "productivity": 0.0,
            "status": "No Study Sessions Yet",
            "doing_good": "Your day is ready. Start your first study session.",
            "improvement": "Try completing one focused study session to begin.",
            "consistency": "No data available",
            "intensity": "No data available",
            "pattern": "No data available",
            "focus_balance": "No data available"
        }

    hours = np.array([record["hours"] for record in records])

    studied = float(np.sum(hours))
    remaining = float(max(0, goal - studied))
    productivity = float((studied / goal) * 100)

    if productivity >= 100:
        status = "Daily Goal Completed!"
        doing_good = "Excellent work! You completed your daily study goal."
        improvement = "Try maintaining this strong study routine tomorrow."
    elif productivity >= 75:
        status = "Great Progress!"
        doing_good = "You are very close to completing your daily goal."
        improvement = "Try one more focused study session to complete your goal."
    elif productivity >= 50:
        status = "Good Progress"
        doing_good = "You completed more than half of your study goal."
        improvement = "Try adding another focused study session."
    else:
        status = "Need More Focus"
        doing_good = "You started your study journey today."
        improvement = "Try planning another focused study session."

    standard_deviation = float(np.std(hours))
    if standard_deviation < 0.5:
        consistency = "Excellent"
    elif standard_deviation < 1:
        consistency = "Good"
    elif standard_deviation < 2:
        consistency = "Moderate"
    else:
        consistency = "Low"

    average_session = float(np.mean(hours))
    if average_session < 1:
        intensity = "Short Focus Sessions"
    elif average_session < 2:
        intensity = "Balanced Study"
    elif average_session < 3:
        intensity = "Deep Study"
    else:
        intensity = "Very Long Sessions"

    if len(hours) == 1:
        pattern = "Need More Sessions"
    else:
        differences = np.diff(hours)
        if np.all(differences >= 0):
            pattern = "Improving"
        elif np.all(differences <= 0):
            pattern = "Decreasing"
        else:
            pattern = "Mixed Pattern"

    category_data = {}
    for record in records:
        category = record["category"]
        if category not in category_data:
            category_data[category] = 0
        category_data[category] += record["hours"]

    category_hours = np.array(list(category_data.values()))

    if len(category_hours) == 1:
        focus_balance = "Focused on One Area"
    else:
        category_std = float(np.std(category_hours))
        if category_std < 1:
            focus_balance = "Well Balanced"
        elif category_std < 2:
            focus_balance = "Mostly Balanced"
        else:
            focus_balance = "Highly Concentrated"

    return {
        "daily_goal": float(goal),
        "studied": float(studied),
        "remaining": float(remaining),
        "productivity": round(float(productivity), 2),
        "status": status,
        "doing_good": doing_good,
        "improvement": improvement,
        "consistency": consistency,
        "intensity": intensity,
        "pattern": pattern,
        "focus_balance": focus_balance
    }
