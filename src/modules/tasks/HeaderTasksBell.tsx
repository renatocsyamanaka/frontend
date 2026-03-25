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
        <div style={{ width: 360, padding: 24, display: 'flex', justifyContent: 'center' }}>
          <Spin />
        </div>
      );
    }

    if (!items.length) {
      return (
        <div style={{ width: 320, padding: 16 }}>
          <Empty description="Nenhuma atividade" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }

    return (
      <div style={{ width: 360, maxHeight: 420, overflowY: 'auto' }}>
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#fff',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <Text strong>Atividades</Text>

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
            >
              Ver todas
            </Button>
          ) : null}
        </div>

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
                background: item.read ? '#fff' : '#f6ffed',
                alignItems: 'flex-start',
              }}
            >
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <Text strong={!item.read}>{item.title}</Text>

                {item.description ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
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
    );
  }, [items, loading, onItemClick, onOpenAll]);

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={['click']}
      dropdownRender={() => menuContent}
      placement="bottomRight"
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