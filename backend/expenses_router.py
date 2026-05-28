"""expenses_router.py"""
import logging
from fastapi import APIRouter, Depends
from schemas.expenses import ExpenseCreate, ExpenseUpdate
from services.expenses import get_all_expenses, create_expense, update_expense, delete_expense
from utils import require_admin, verify_token

logger = logging.getLogger(__name__)
expenses_router = APIRouter(tags=["Expenses"])

@expenses_router.get("/expenses")
def list_expenses(user=Depends(verify_token)):
    return {"expenses": get_all_expenses()}

@expenses_router.post("/expenses", status_code=201)
def add_expense(body: ExpenseCreate, user=Depends(require_admin)):
    return create_expense(body.dict())

@expenses_router.put("/expenses/{row_number}")
def edit_expense(row_number: int, body: ExpenseUpdate, user=Depends(require_admin)):
    return update_expense(row_number, body.dict())

@expenses_router.delete("/expenses/{row_number}")
def remove_expense(row_number: int, user=Depends(require_admin)):
    return delete_expense(row_number)
