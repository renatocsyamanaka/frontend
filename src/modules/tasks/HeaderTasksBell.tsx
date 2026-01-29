import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Badge, Button, List, Popover, Tooltip, message } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

type Task = {
  id: number;
  title: string;
  dueDate?: string | null;
  creator?: { id: number; name: string };
  location?: { id: number; name: string } | null;
};

export default function HeaderTasksBell() {
  const qc = useQueryClient();
  const prevCount = useRef(0);

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'mine-new'],
    queryFn: async () =>
      (await api.get('/tasks', { params: { mine: true, status: 'NEW' } })).data,
    refetchInterval: 20000, // 20s
    refetchIntervalInBackground: true,
    staleTime: 5000,
  });

  // avisa quando aparecerem novas
  useEffect(() => {
    if (tasks.length > prevCount.current) {
      const diff = tasks.length - prevCount.current;
      message.info(`Você tem ${diff} nova(s) demanda(s).`);
    }
    prevCount.current = tasks.length;
  }, [tasks.length]);

  const ack = useMutation({
    mutationFn: async (id: number) => (await api.patch(`/tasks/${id}/ack`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', 'mine-new'] });
      qc.invalidateQueries({ queryKey: ['tasks'] }); // planner
      message.success('Recebimento confirmado');
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao confirmar'),
  });

  const content = (
    <div style={{ width: 360 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong>Minhas novas demandas</strong>
        <Link to="/tasks">Abrir Planner</Link>
      </div>
      <List
        dataSource={tasks}
        locale={{ emptyText: 'Sem novas demandas' }}
        renderItem={(t) => (
          <List.Item
            actions={[
              <Tooltip title="Confirmar recebimento" key="ack">
                <Button
                  size="small"
                  icon={<CheckOutlined />}
                  loading={ack.isPending}
                  onClick={() => ack.mutate(t.id)}
                />
              </Tooltip>,
            ]}
          >
            <List.Item.Meta
              title={t.title}
              description={[
                t.location?.name ? `Local: ${t.location.name}` : null,
                t.creator?.name ? `Criada por: ${t.creator.name}` : null,
                t.dueDate ? `Prazo: ${new Date(t.dueDate).toLocaleDateString('pt-BR')}` : null,
              ]
                .filter(Boolean)
                .join(' • ')}
            />
          </List.Item>
        )}
      />
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="bottomRight">
      <Badge count={tasks.length} size="small" overflowCount={99}>
        <Button type="text" icon={<BellOutlined />} />
      </Badge>
    </Popover>
  );
}
