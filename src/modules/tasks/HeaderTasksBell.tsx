import { useMemo, useState } from 'react';
import { Badge, Button, Dropdown, List, Space, Typography, Empty, Spin } from 'antd';
import { BellOutlined } from '@ant-design/icons';

const { Text } = Typography;

type ActivityItem = {
  id: string | number;
  title: string;
  description?: string;
  createdAt?: string;
  read?: boolean;
};

type Props = {
  items?: ActivityItem[];
  loading?: boolean;
  unreadCount?: number;
  onOpenAll?: () => void;
  onItemClick?: (item: ActivityItem) => void;
};

const PANEL_WIDTH = 360;
const PANEL_MAX_HEIGHT = 420;

const panelShellStyle: React.CSSProperties = {
  width: PANEL_WIDTH,
  background: '#ffffff',
  border: '1px solid #e6eef7',
  borderRadius: 16,
  boxShadow: '0 16px 40px rgba(15, 23, 42, 0.14)',
  overflow: 'hidden',
};

export default function HeaderTasksBell({
  items = [],
  loading = false,
  unreadCount = 0,
  onOpenAll,
  onItemClick,
}: Props) {
  const [open, setOpen] = useState(false);

  const menuContent = useMemo(() => {
    if (loading) {
      return (
        <div style={panelShellStyle}>
          <div
            style={{
              minHeight: 220,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              boxSizing: 'border-box',
            }}
          >
            <Spin />
          </div>
        </div>
      );
    }

    if (!items.length) {
      return (
        <div style={panelShellStyle}>
          <div
            style={{
              minHeight: 220,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              boxSizing: 'border-box',
            }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Nenhuma atividade"
            />
          </div>
        </div>
      );
    }

    return (
      <div style={panelShellStyle}>
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #eef2f7',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff',
          }}
        >
          <Text strong style={{ color: '#0f172a' }}>
            Atividades
          </Text>

          {onOpenAll ? (
            <Button
              type="link"
              size="small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenAll();
                setOpen(false);
              }}
              style={{ paddingInline: 0 }}
            >
              Ver todas
            </Button>
          ) : null}
        </div>

        <div
          style={{
            maxHeight: PANEL_MAX_HEIGHT - 53,
            overflowY: 'auto',
            background: '#ffffff',
          }}
        >
          <List
            dataSource={items}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                onClick={() => {
                  onItemClick?.(item);
                  setOpen(false);
                }}
                style={{
                  cursor: onItemClick ? 'pointer' : 'default',
                  padding: '12px 16px',
                  background: item.read ? '#ffffff' : '#f6ffed',
                  alignItems: 'flex-start',
                  borderBottom: '1px solid #f5f5f5',
                  transition: 'background 0.2s ease',
                }}
              >
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Text strong={!item.read} style={{ color: '#111827' }}>
                    {item.title}
                  </Text>

                  {item.description ? (
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      {item.description}
                    </Text>
                  ) : null}

                  {item.createdAt ? (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {item.createdAt}
                    </Text>
                  ) : null}
                </Space>
              </List.Item>
            )}
          />
        </div>
      </div>
    );
  }, [items, loading, onItemClick, onOpenAll]);

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={['click']}
      popupRender={() => menuContent}
      placement="bottomRight"
      overlayStyle={{
        paddingTop: 8,
        background: 'transparent',
        boxShadow: 'none',
      }}
    >
      <Badge count={unreadCount} size="small" overflowCount={99}>
        <Button
          type="text"
          className="header-bell-wrap"
          icon={<BellOutlined />}
          aria-label="Abrir atividades"
        />
      </Badge>
    </Dropdown>
  );
}