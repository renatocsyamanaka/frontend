import { Avatar, Modal } from 'antd';

export type OrgNode = {
  id: number;
  name: string;
  role?: string | null;
  avatarUrl?: string | null;
  children?: OrgNode[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  parent?: OrgNode | null;
};

export function OrgChildrenModal({ open, onClose, parent }: Props) {
  const children = parent?.children || [];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={onClose}
      okText="OK"
      title={parent ? `${parent.name} — ${children.length} subordinado(s)` : 'Subordinados'}
      width={920}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16 }}>
        {children.map((c) => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              background: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,.06)',
              minHeight: 72,
            }}
          >
            <Avatar size={48} src={c.avatarUrl || undefined}>
              {c.name?.[0]}
            </Avatar>
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontWeight: 600 }}>{c.name}</div>
              {c.role && <div style={{ fontSize: 12, color: '#6b7280' }}>{c.role}</div>}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
