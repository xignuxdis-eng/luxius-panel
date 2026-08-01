import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'postgresql://postgres:postgres@localhost:5432/luxius'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
