from app import app, db, Presupuesto

with app.app_context():
    orders = Presupuesto.query.filter(Presupuesto.descripcion.ilike('%Proyecto OT-6%')).all()
    for o in orders:
        db.session.delete(o)
    db.session.commit()
    print(f"Deleted {len(orders)} duplicate OT-6 orders.")
