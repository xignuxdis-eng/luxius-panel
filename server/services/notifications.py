"""
Sistema de notificaciones automáticas
Dispara notificaciones cuando ocurren eventos en el sistema
"""
from models import Notification, NotificationType, User, UserRole
from database import db

class NotificationService:
    """Servicio para crear notificaciones automáticas"""
    
    @staticmethod
    def notify_user(user_id, notification_type, title, message, link=None, metadata=None):
        """Crear notificación para un usuario específico"""
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            link=link,
            extra_data=metadata
        )
        db.session.add(notification)
        db.session.commit()
        return notification
    
    @staticmethod
    def notify_role(role, notification_type, title, message, link=None, metadata=None):
        """Crear notificación para todos los usuarios de un rol"""
        users = User.query.filter_by(role=role, active=True).all()
        notifications = []
        
        for user in users:
            notification = Notification(
                user_id=user.id,
                type=notification_type,
                title=title,
                message=message,
                link=link,
                extra_data=metadata
            )
            db.session.add(notification)
            notifications.append(notification)
        
        db.session.commit()
        return notifications
    
    # ==================== EVENTOS DE PRESUPUESTOS ====================
    
    @staticmethod
    def on_quote_created(quote):
        """Notificar cuando se crea un presupuesto"""
        # Notificar al cliente
        NotificationService.notify_user(
            user_id=quote.customer_id,
            notification_type=NotificationType.INFO,
            title="Presupuesto Creado",
            message=f"Se ha creado el presupuesto #{quote.id}",
            link=f"/presupuestos/{quote.id}"
        )
        
        # Notificar a admins
        NotificationService.notify_role(
            role=UserRole.ADMIN,
            notification_type=NotificationType.INFO,
            title="Nuevo Presupuesto",
            message=f"Nuevo presupuesto #{quote.id} creado",
            link=f"/admin/presupuestos/{quote.id}"
        )
    
    @staticmethod
    def on_quote_approved(quote):
        """Notificar cuando se aprueba un presupuesto"""
        NotificationService.notify_user(
            user_id=quote.customer_id,
            notification_type=NotificationType.QUOTE_APPROVED,
            title="Presupuesto Aprobado",
            message=f"Tu presupuesto #{quote.id} ha sido aprobado",
            link=f"/presupuestos/{quote.id}"
        )
        
        # Notificar a diseñadores
        NotificationService.notify_role(
            role=UserRole.ARTISTA,
            notification_type=NotificationType.NEW_ORDER,
            title="Nuevo Trabajo",
            message=f"Presupuesto #{quote.id} aprobado - requiere diseño",
            link=f"/trabajos/{quote.id}"
        )
    
    # ==================== EVENTOS DE ÓRDENES ====================
    
    @staticmethod
    def on_order_created(order):
        """Notificar cuando se crea una orden"""
        NotificationService.notify_user(
            user_id=order.customer_id,
            notification_type=NotificationType.NEW_ORDER,
            title="Orden Creada",
            message=f"Se ha creado la orden #{order.id}",
            link=f"/orders/{order.id}"
        )
        
        NotificationService.notify_role(
            role=UserRole.ADMIN,
            notification_type=NotificationType.NEW_ORDER,
            title="Nueva Orden",
            message=f"Nueva orden #{order.id} recibida",
            link=f"/admin/orders/{order.id}"
        )
    
    @staticmethod
    def on_order_status_changed(order, old_status, new_status):
        """Notificar cambio de estado de orden"""
        status_messages = {
            'pendiente': 'está pendiente',
            'en_proceso': 'está en proceso',
            'confirmado': 'ha sido confirmada',
            'completado': 'ha sido completada',
            'cancelado': 'ha sido cancelada'
        }
        
        NotificationService.notify_user(
            user_id=order.customer_id,
            notification_type=NotificationType.ORDER_UPDATED,
            title="Estado de Orden Actualizado",
            message=f"Tu orden #{order.id} {status_messages.get(new_status, 'ha cambiado')}",
            link=f"/orders/{order.id}"
        )
    
    # ==================== EVENTOS DE IMPRESIÓN ====================
    
    @staticmethod
    def on_print_assigned(queue_item):
        """Notificar cuando se asigna un trabajo a impresión"""
        NotificationService.notify_role(
            role=UserRole.IMPRESOR,
            notification_type=NotificationType.INFO,
            title="Trabajo Asignado",
            message=f"Nuevo trabajo asignado a {queue_item.machine.nombre}",
            link=f"/printer/queue/{queue_item.id}"
        )
    
    @staticmethod
    def on_print_ready(queue_item):
        """Notificar cuando una impresión está completada"""
        order = queue_item.order
        
        NotificationService.notify_user(
            user_id=order.customer_id,
            notification_type=NotificationType.PRINT_COMPLETED,
            title="Impresión Completada",
            message=f"Tu orden #{order.id} está lista para retirar",
            link=f"/orders/{order.id}"
        )
        
        NotificationService.notify_role(
            role=UserRole.ADMIN,
            notification_type=NotificationType.PRINT_COMPLETED,
            title="Impresión Completada",
            message=f"Orden #{order.id} completada en {queue_item.machine.nombre}",
            link=f"/printer/queue/{queue_item.id}"
        )
    
    @staticmethod
    def on_print_rejected(queue_item, motivo):
        """Notificar cuando se rebota una impresión"""
        order = queue_item.order
        
        # Notificar al cliente
        NotificationService.notify_user(
            user_id=order.customer_id,
            notification_type=NotificationType.WARNING,
            title="Problema con tu Orden",
            message=f"Hubo un problema con tu orden #{order.id}: {motivo}",
            link=f"/orders/{order.id}"
        )
        
        # Notificar al diseñador asignado si existe
        if hasattr(order, 'designer_id') and order.designer_id:
            NotificationService.notify_user(
                user_id=order.designer_id,
                notification_type=NotificationType.WARNING,
                title="Trabajo Rebotado",
                message=f"Orden #{order.id} rebotada: {motivo}",
                link=f"/trabajos/{order.id}"
            )
    
    # ==================== EVENTOS DE MENSAJES ====================
    
    @staticmethod
    def on_new_message(message, conversation):
        """Notificar cuando llega un nuevo mensaje"""
        # Notificar a todos los participantes excepto el remitente
        for participant in conversation.participants:
            if participant.user_id != message.sender_id and participant.is_active:
                NotificationService.notify_user(
                    user_id=participant.user_id,
                    notification_type=NotificationType.NEW_MESSAGE,
                    title="Nuevo Mensaje",
                    message=f"{message.sender.full_name}: {message.content[:50]}...",
                    link=f"/messages/{conversation.id}"
                )
    
    # ==================== EVENTOS DE ARCHIVOS ====================
    
    @staticmethod
    def on_file_uploaded(order_file, order_or_quote):
        """Notificar cuando se sube un archivo"""
        # Determinar si es orden o presupuesto
        if order_file.order_id:
            entity_type = "orden"
            entity_id = order_file.order_id
            entity = order_or_quote
        else:
            entity_type = "presupuesto"
            entity_id = order_file.quote_id
            entity = order_or_quote
        
        # Notificar a admins y diseñadores
        for role in [UserRole.ADMIN, UserRole.ARTISTA]:
            NotificationService.notify_role(
                role=role,
                notification_type=NotificationType.INFO,
                title="Archivo Subido",
                message=f"Nuevo archivo subido a {entity_type} #{entity_id}: {order_file.filename}",
                link=f"/{entity_type}s/{entity_id}"
            )

# Helper function para usar en las rutas
def create_notification_helper(user_id, notification_type, title, message, link=None, metadata=None):
    """
    Helper function que puede ser importado en las rutas
    """
    return NotificationService.notify_user(user_id, notification_type, title, message, link, metadata)
