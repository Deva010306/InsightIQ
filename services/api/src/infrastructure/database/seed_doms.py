import asyncio
import uuid
import random
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.infrastructure.database.connection import get_session_factory, get_engine
from src.infrastructure.database.models import (
    Tenant, Customer, Product, SaleTransaction, Campaign, CustomerFeedback, ChurnEvent
)

logger = structlog.get_logger(__name__)

DEV_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

def generate_random_date(start_date: datetime, end_date: datetime) -> datetime:
    delta = end_date - start_date
    random_days = random.randint(0, delta.days)
    return start_date + timedelta(days=random_days, hours=random.randint(0, 23), minutes=random.randint(0, 59))

async def seed_doms_data():
    session_factory = get_session_factory()
    
    async with session_factory() as db:
        tenant = await db.execute(select(Tenant).where(Tenant.id == DEV_TENANT_ID))
        tenant = tenant.scalar_one_or_none()
        
        if not tenant:
            logger.error("tenant_not_found", tenant_id=str(DEV_TENANT_ID))
            return

        existing_customers = await db.execute(select(Customer).where(Customer.tenant_id == DEV_TENANT_ID))
        if existing_customers.scalars().first():
            logger.info("doms_data_already_seeded")
            return

        logger.info("seeding_doms_data_start")

        # 1. Products
        products_data = [
            {"name": "Doms Neon Erasers Box", "category": "Erasers", "price": 50.0},
            {"name": "Doms Groove Pencils Pack", "category": "Pencils", "price": 100.0},
            {"name": "Doms Water Colours 12 Shades", "category": "Colors", "price": 150.0},
            {"name": "Doms Geometry Box", "category": "Math Instruments", "price": 250.0},
            {"name": "Doms Sketch Pens 24 Shades", "category": "Pens", "price": 120.0},
            {"name": "Doms A4 Notebook 200 Pages", "category": "Notebooks", "price": 60.0},
            {"name": "Doms Whiteboard Markers", "category": "Markers", "price": 200.0}
        ]
        
        products = []
        for p in products_data:
            prod = Product(
                id=uuid.uuid4(), tenant_id=DEV_TENANT_ID,
                name=p["name"], category=p["category"], price=p["price"]
            )
            db.add(prod)
            products.append(prod)

        # 2. Customers
        regions = ["North", "South", "East", "West"]
        segments = ["SMB", "Mid-Market", "Enterprise"]
        
        customers = []
        for i in range(150): # 150 customers
            segment = random.choices(segments, weights=[0.6, 0.3, 0.1])[0]
            region = random.choice(regions)
            health_score = random.uniform(40.0, 100.0)
            
            cust = Customer(
                id=uuid.uuid4(), tenant_id=DEV_TENANT_ID,
                name=f"Stationery Store {i+1}",
                segment=segment,
                region=region,
                health_score=health_score
            )
            db.add(cust)
            customers.append(cust)

        await db.flush()

        # 3. Campaigns
        end_date = datetime.utcnow()
        start_date = end_date - relativedelta(months=12)
        
        campaigns = [
            {"name": "Back to School 2023", "channel": "Social Media", "spend": 50000.0},
            {"name": "Diwali Offer", "channel": "Email", "spend": 20000.0},
            {"name": "New Year Bulk Discount", "channel": "B2B Outreach", "spend": 30000.0},
            {"name": "Summer Art Contest", "channel": "Social Media", "spend": 40000.0}
        ]
        
        for c in campaigns:
            c_start = generate_random_date(start_date, end_date - timedelta(days=30))
            db.add(Campaign(
                id=uuid.uuid4(), tenant_id=DEV_TENANT_ID,
                name=c["name"], channel=c["channel"], spend=c["spend"],
                start_date=c_start, end_date=c_start + timedelta(days=30)
            ))

        # 4. Transactions (Simulating a drop in West region recently)
        for i in range(2000):
            cust = random.choice(customers)
            prod = random.choice(products)
            
            t_date = generate_random_date(start_date, end_date)
            
            # Simulate revenue drop in West region in last month
            is_recent = (end_date - t_date).days < 30
            if is_recent and cust.region == "West" and random.random() < 0.6:
                continue # Skip 60% of transactions for West in last month to simulate drop
                
            qty = random.randint(1, 100) if cust.segment == "SMB" else random.randint(50, 500)
            
            db.add(SaleTransaction(
                id=uuid.uuid4(), tenant_id=DEV_TENANT_ID,
                customer_id=cust.id, product_id=prod.id,
                amount=prod.price * qty * random.uniform(0.9, 1.0), # slight discounts
                quantity=qty, date=t_date
            ))

        # 5. Feedback and Churn
        for cust in customers:
            if random.random() < 0.3: # 30% left feedback
                f_date = generate_random_date(start_date, end_date)
                rating = random.randint(1, 5)
                # If they are in West and recent, lower rating
                if cust.region == "West" and (end_date - f_date).days < 60:
                    rating = random.randint(1, 3)
                    comment = random.choice(["Late delivery", "Quality issues", "Competitor offered better price"])
                else:
                    comment = random.choice(["Great product", "Good value", "Satisfied", "Average"]) if rating > 3 else "Not great"
                
                db.add(CustomerFeedback(
                    id=uuid.uuid4(), tenant_id=DEV_TENANT_ID,
                    customer_id=cust.id, rating=rating, comment=comment, date=f_date
                ))
            
            if cust.health_score < 60.0 and random.random() < 0.4:
                db.add(ChurnEvent(
                    id=uuid.uuid4(), tenant_id=DEV_TENANT_ID,
                    customer_id=cust.id, date=generate_random_date(end_date - timedelta(days=90), end_date),
                    reason="Better pricing elsewhere"
                ))
        
        await db.commit()
        logger.info("seeding_doms_data_complete")

if __name__ == "__main__":
    asyncio.run(seed_doms_data())
