"""
event_dispatcher.py
Sistema centralizado de eventos y notificaciones automáticas
Integra eventos del sistema con notificaciones y WebSocket
"""

from datetime import datetime
from typing import Dict, Any, Optional, List
from database import db
from models.messaging import Notification, NotificationType
from services.notifications import NotificationService

try:
    from websocket import socketio
    WEBSOCKET_AVAILABLE = True
except ImportError:
    WEBSOCKET_AVAILABLE = False
    print("⚠️ WebSocket no disponible - notificaciones solo por DB")


class EventDispatcher:
    """Despachador centralizado de eventos del sistema"""
    
    @staticmethod
    def emit_event(event_type: str, data: Dict[str, Any], user_ids: List[int] = None):
        """
        Emitir evento por WebSocket
        
        Args:
            event_type: Tipo de evento (print_queue_updated, order_status_changed, etc.)
            data: Datos del evento
            user_ids: IDs de usuarios específicos (None = broadcast)
        """
        if not WEBSOCKET_AVAILABLE:
            return
            
        try:
            if user_ids:
                # Emitir a usuarios específicos
                for user_id in user_ids:
                    socketio.emit(event_type, data, room=f'user_{user_id}')
            else:
                # Broadcast a todos
                socketio.emit(event_type, data)
        except Exception as e:
            print(f"❌ Error emitiendo evento {event_type}: {e}")
    
    
    # ==================== EVENTOS DE ÓRDENES ====================
    
    @staticmethod
    def order_created(order_id: int, client_id: int, created_by_id: int):
        """Nueva orden creada"""
        from legacy_models import Orden, Usuario, Cliente
        
        try:
            order = Orden.query.get(order_id)
            if not order:
                return
            
            # Notificar al cliente
            NotificationService.notify_user(
                user_id=client_id,
                title="Nueva orden creada",
                message=f"Tu orden #{order_id} ha sido creada exitosamente",
                notification_type=NotificationType.ORDER_CREATED,
                related_order_id=order_id
            )
            
            # Notificar a administradores
            admins = Usuario.query.filter_by(role='admin', activo=True).all()
            for admin in admins:
                NotificationService.notify_user(
                    user_id=admin.id,
                    title="Nueva orden en el sistema",
                    message=f"Orden #{order_id} creada por {order.cliente.nombre if order.cliente else 'Cliente'}",
                    notification_type=NotificationType.ORDER_CREATED,
                    related_order_id=order_id
                )
            
            # Emitir evento WebSocket
            EventDispatcher.emit_event('order_created', {
                'order_id': order_id,
                'status': order.estado,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            print(f"❌ Error en order_created: {e}")
    
    
    @staticmethod
    def order_status_changed(order_id: int, old_status: str, new_status: str, changed_by_id: int):
        """Estado de orden cambiado"""
        from legacy_models import Orden
        
        try:
            order = Orden.query.get(order_id)
            if not order:
                return
            
            status_messages = {
                'presupuesto': 'Tu orden está en fase de presupuesto',
                'pendiente': 'Tu orden está pendiente de aprobación',
                'en_produccion': '🚀 Tu orden está en producción',
                'completado': '✅ Tu orden ha sido completada',
                'cancelado': '❌ Tu orden ha sido cancelada',
                'en_espera': '⏸️ Tu orden está en espera'
            }
            
            # Notificar al cliente
            if order.cliente_id:
                NotificationService.notify_user(
                    user_id=order.cliente_id,
                    title=f"Orden #{order_id} actualizada",
                    message=status_messages.get(new_status, f"Estado: {new_status}"),
                    notification_type=NotificationType.ORDER_STATUS_CHANGED,
                    related_order_id=order_id,
                    priority='alta' if new_status in ['completado', 'cancelado'] else 'normal'
                )
            
            # Emitir evento WebSocket
            EventDispatcher.emit_event('order_status_changed', {
                'order_id': order_id,
                'old_status': old_status,
                'new_status': new_status,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            print(f"❌ Error en order_status_changed: {e}")
    
    
    @staticmethod
    def order_assigned(order_id: int, designer_id: int, assigned_by_id: int):
        """Orden asignada a diseñador"""
        from legacy_models import Orden, Usuario
        
        try:
            order = Orden.query.get(order_id)
            designer = Usuario.query.get(designer_id)
            
            if not order or not designer:
                return
            
            # Notificar al diseñador
            NotificationService.notify_user(
                user_id=designer_id,
                title="Nueva orden asignada",
                message=f"Se te asignó la orden #{order_id} - {order.cliente.nombre if order.cliente else 'Cliente'}",
                notification_type=NotificationType.ORDER_ASSIGNED,
                related_order_id=order_id,
                priority='alta'
            )
            
            # Emitir evento WebSocket
            EventDispatcher.emit_event('order_assigned', {
                'order_id': order_id,
                'designer_id': designer_id,
                'designer_name': designer.nombre,
                'timestamp': datetime.now().isoformat()
            }, user_ids=[designer_id])
            
        except Exception as e:
            print(f"❌ Error en order_assigned: {e}")
    
    
    # ==================== EVENTOS DE COLA DE IMPRESIÓN ====================
    
    @staticmethod
    def print_job_queued(queue_id: int, machine_id: int, order_id: int):
        """Trabajo agregado a la cola de impresión"""
        from models.printer import PrintQueue, Machine
        from legacy_models import Usuario
        
        try:
            job = PrintQueue.query.get(queue_id)
            machine = Machine.query.get(machine_id)
            
            if not job or not machine:
                return
            
            # Notificar a impresores
            impresores = Usuario.query.filter_by(role='impresor', activo=True).all()
            for impresor in impresores:
                NotificationService.notify_user(
                    user_id=impresor.id,
                    title="Nuevo trabajo en cola",
                    message=f"Orden #{order_id} agregada a {machine.nombre}",
                    notification_type=NotificationType.PRINT_JOB_QUEUED,
                    related_order_id=order_id
                )
            
            # Emitir evento WebSocket
            EventDispatcher.emit_event('print_queue_updated', {
                'queue_id': queue_id,
                'machine_id': machine_id,
                'order_id': order_id,
                'status': job.status.value,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            print(f"❌ Error en print_job_queued: {e}")
    
    
    @staticmethod
    def print_job_started(queue_id: int, impresor_id: int):
        """Trabajo de impresión iniciado"""
        from models.printer import PrintQueue
        
        try:
            job = PrintQueue.query.get(queue_id)
            if not job:
                return
            
            # Notificar al cliente si existe
            from legacy_models import Orden
            order = Orden.query.get(job.order_id)
            
            if order and order.cliente_id:
                NotificationService.notify_user(
                    user_id=order.cliente_id,
                    title="Impresión iniciada",
                    message=f"Tu orden #{job.order_id} está siendo impresa",
                    notification_type=NotificationType.PRINT_JOB_STARTED,
                    related_order_id=job.order_id
                )
            
            # Emitir evento WebSocket
            EventDispatcher.emit_event('print_queue_updated', {
                'queue_id': queue_id,
                'order_id': job.order_id,
                'status': 'imprimiendo',
                'impresor_id': impresor_id,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            print(f"❌ Error en print_job_started: {e}")
    
    
    @staticmethod
    def print_job_completed(queue_id: int, cantidad_impresa: int):
        """Trabajo de impresión completado"""
        from models.printer import PrintQueue
        from legacy_models import Orden
        
        try:
            job = PrintQueue.query.get(queue_id)
            if not job:
                return
            
            order = Orden.query.get(job.order_id)
            
            # Notificar al cliente
            if order and order.cliente_id:
                NotificationService.notify_user(
                    user_id=order.cliente_id,
                    title="✅ Impresión completada",
                    message=f"Tu orden #{job.order_id} ha sido impresa ({cantidad_impresa} unidades)",
                    notification_type=NotificationType.PRINT_JOB_COMPLETED,
                    related_order_id=job.order_id,
                    priority='alta'
                )
            
            # Emitir evento WebSocket
            EventDispatcher.emit_event('print_queue_updated', {
                'queue_id': queue_id,
                'order_id': job.order_id,
                'status': 'completado',
                'cantidad_impresa': cantidad_impresa,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            print(f"❌ Error en print_job_completed: {e}")
    
    
    @staticmethod
    def print_job_rejected(queue_id: int, motivo: str):
        """Trabajo de impresión rebotado"""
        from models.printer import PrintQueue
        from legacy_models import Orden, Usuario
        
        try:
            job = PrintQueue.query.get(queue_id)
            if not job:
                return
            
            order = Orden.query.get(job.order_id)
            
            # Notificar a diseñadores y admins
            if order and order.diseñador_id:
                NotificationService.notify_user(
                    user_id=order.diseñador_id,
                    title="⚠️ Trabajo rebotado",
                    message=f"Orden #{job.order_id} rebotada: {motivo}",
                    notification_type=NotificationType.PRINT_JOB_REJECTED,
                    related_order_id=job.order_id,
                    priority='urgente'
                )
            
            # Emitir evento WebSocket
            EventDispatcher.emit_event('print_queue_updated', {
                'queue_id': queue_id,
                'order_id': job.order_id,
                'status': 'rebotado',
                'motivo': motivo,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            print(f"❌ Error en print_job_rejected: {e}")
    
    
    # ==================== EVENTOS DE ARCHIVOS ====================
    
    @staticmethod
    def file_uploaded(file_id: int, order_id: int, uploaded_by_id: int):
        """Archivo subido a una orden"""
        from models.media import OrderFile
        from legacy_models import Orden, Usuario
        
        try:
            file = OrderFile.query.get(file_id)
            order = Orden.query.get(order_id)
            
            if not file or not order:
                return
            
            # Notificar al cliente
            if order.cliente_id and order.cliente_id != uploaded_by_id:
                NotificationService.notify_user(
                    user_id=order.cliente_id,
                    title="Archivo agregado",
                    message=f"Se agregó {file.filename} a tu orden #{order_id}",
                    notification_type=NotificationType.FILE_UPLOADED,
                    related_order_id=order_id
                )
            
            # Notificar al diseñador si existe
            if order.diseñador_id and order.diseñador_id != uploaded_by_id:
                NotificationService.notify_user(
                    user_id=order.diseñador_id,
                    title="Archivo nuevo",
                    message=f"Archivo agregado a orden #{order_id}: {file.filename}",
                    notification_type=NotificationType.FILE_UPLOADED,
                    related_order_id=order_id
                )
            
            # Emitir evento WebSocket
            EventDispatcher.emit_event('file_uploaded', {
                'file_id': file_id,
                'order_id': order_id,
                'filename': file.filename,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            print(f"❌ Error en file_uploaded: {e}")
    
    
    # ==================== EVENTOS DE CHAT ====================
    
    @staticmethod
    def message_sent(message_id: int, conversation_id: int, sender_id: int):
        """Mensaje enviado en conversación"""
        from models.messaging import ChatMessage, ConversationParticipant
        
        try:
            message = ChatMessage.query.get(message_id)
            if not message:
                return
            
            # Obtener participantes de la conversación
            participants = ConversationParticipant.query.filter_by(
                conversation_id=conversation_id
            ).all()
            
            # Notificar a todos los participantes excepto el remitente
            for participant in participants:
                if participant.user_id != sender_id:
                    NotificationService.notify_user(
                        user_id=participant.user_id,
                        title="Nuevo mensaje",
                        message=f"Mensaje nuevo en conversación #{conversation_id}",
                        notification_type=NotificationType.NEW_MESSAGE,
                        priority='normal'
                    )
            
            # Emitir evento WebSocket
            participant_ids = [p.user_id for p in participants if p.user_id != sender_id]
            EventDispatcher.emit_event('new_message', {
                'message_id': message_id,
                'conversation_id': conversation_id,
                'sender_id': sender_id,
                'content': message.content,
                'timestamp': message.created_at.isoformat()
            }, user_ids=participant_ids)
            
        except Exception as e:
            print(f"❌ Error en message_sent: {e}")
    
    
    # ==================== EVENTOS DEL SISTEMA ====================
    
    @staticmethod
    def system_alert(title: str, message: str, priority: str = 'normal', user_ids: List[int] = None):
        """Alerta del sistema"""
        try:
            if user_ids:
                # Notificar a usuarios específicos
                for user_id in user_ids:
                    NotificationService.notify_user(
                        user_id=user_id,
                        title=title,
                        message=message,
                        notification_type=NotificationType.SYSTEM_ALERT,
                        priority=priority
                    )
            else:
                # Notificar a todos los usuarios activos
                from legacy_models import Usuario
                users = Usuario.query.filter_by(activo=True).all()
                for user in users:
                    NotificationService.notify_user(
                        user_id=user.id,
                        title=title,
                        message=message,
                        notification_type=NotificationType.SYSTEM_ALERT,
                        priority=priority
                    )
            
            # Emitir evento WebSocket
            EventDispatcher.emit_event('system_alert', {
                'title': title,
                'message': message,
                'priority': priority,
                'timestamp': datetime.now().isoformat()
            }, user_ids=user_ids)
            
        except Exception as e:
            print(f"❌ Error en system_alert: {e}")


# Exportar instancia singleton
event_dispatcher = EventDispatcher()
