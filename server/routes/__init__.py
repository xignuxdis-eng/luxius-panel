from flask import Blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
operators_bp = Blueprint('operators', __name__, url_prefix='/api/operators')
tasks_bp = Blueprint('tasks', __name__, url_prefix='/api/tasks')
orders_bp = Blueprint('orders', __name__, url_prefix='/api/orders')
xana_bp = Blueprint('xana', __name__, url_prefix='/api/xana')
import_bp = Blueprint('import', __name__, url_prefix='/api/import-cloud')

