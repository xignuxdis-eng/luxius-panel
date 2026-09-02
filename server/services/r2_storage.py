"""
Módulo de almacenamiento unificado en Cloudflare R2 para LuXius Backend
Soporta subida, eliminación y generación de URLs directas para imágenes, PDFs y relevamientos.
"""

import os
import boto3
from botocore.config import Config as BotoConfig
from config import Config

class CloudflareR2Storage:
    def __init__(self):
        self.account_id = Config.R2_ACCOUNT_ID
        self.access_key_id = Config.R2_ACCESS_KEY_ID
        self.secret_access_key = Config.R2_SECRET_ACCESS_KEY
        self.bucket_name = Config.R2_BUCKET_NAME
        self.endpoint_url = Config.R2_ENDPOINT_URL

        self._s3_client = None

    @property
    def client(self):
        if self._s3_client is None:
            self._s3_client = boto3.client(
                's3',
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key,
                config=BotoConfig(signature_version='s3v4'),
                region_name='auto'
            )
        return self._s3_client

    def upload_file(self, file_path_or_stream, object_name, content_type=None):
        """
        Sube un archivo o stream a Cloudflare R2
        """
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type

            if isinstance(file_path_or_stream, str):
                self.client.upload_file(file_path_or_stream, self.bucket_name, object_name, ExtraArgs=extra_args)
            else:
                self.client.upload_fileobj(file_path_or_stream, self.bucket_name, object_name, ExtraArgs=extra_args)

            url = f"{self.endpoint_url}/{self.bucket_name}/{object_name}"
            return {"success": True, "object_name": object_name, "url": url}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def delete_file(self, object_name):
        """
        Elimina un objeto de Cloudflare R2
        """
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=object_name)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_public_url(self, object_name):
        """
        Retorna URL de acceso al objeto en R2.
        Usa presigned URLs (24h) ya que el bucket no tiene dominio público.
        """
        return self.get_presigned_url(object_name, expiry=86400)  # 24 horas

    def get_presigned_url(self, object_name, expiry=3600):
        """
        Genera una URL pre-firmada para acceso temporal al objeto.
        """
        try:
            url = self.client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': object_name
                },
                ExpiresIn=expiry
            )
            return url
        except Exception as e:
            print(f"[R2] Error generando presigned URL: {e}")
            return f"{self.endpoint_url}/{self.bucket_name}/{object_name}"

r2_storage = CloudflareR2Storage()
