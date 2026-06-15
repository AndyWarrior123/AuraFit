"""add passive_sync_logs

Revision ID: a1b2c3d4e5f6
Revises: 2fe5251b1a6c
Create Date: 2026-06-15 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '2fe5251b1a6c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'passive_sync_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('steps_since_last_sync', sa.Integer(), nullable=False),
        sa.Column('distance_meters', sa.Float(), nullable=False),
        sa.Column(
            'detected_activity',
            sa.Enum('WALKING', 'RUNNING', 'STILL', name='detectedactivity'),
            nullable=False,
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_passive_sync_logs_user_id'), 'passive_sync_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_passive_sync_logs_timestamp'), 'passive_sync_logs', ['timestamp'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_passive_sync_logs_timestamp'), table_name='passive_sync_logs')
    op.drop_index(op.f('ix_passive_sync_logs_user_id'), table_name='passive_sync_logs')
    op.drop_table('passive_sync_logs')
    op.execute("DROP TYPE IF EXISTS detectedactivity")
