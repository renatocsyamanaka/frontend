import React, { useState } from "react";
import { Card, Avatar, Button, Modal, List, Typography, Spin, Space, Tag, message } from "antd";
import { EyeOutlined, ApartmentOutlined } from "@ant-design/icons";
import axios from "axios";

const { Text, Title } = Typography;

export default function EmployeeCard({ user, onView }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [estrutura, setEstrutura] = useState({ acima: [], atual: null, abaixo: [] });

  const openModal = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const res = await axios.get(`/api/users/${user.id}/structure`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setEstrutura(res.data);
    } catch (err) {
      console.error(err);
      message.error("Erro ao carregar estrutura");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card style={{ width: 420, borderRadius: 14 }} bodyStyle={{ padding: 16 }}>
        <Space align="start">
          <Avatar size={56} src={user.avatarUrl} />
          <div style={{ flex: 1 }}>
            <Space style={{ justifyContent: "space-between", width: "100%" }}>
              <Text strong>{user.name}</Text>
              <Tag color={user.isActive ? "green" : "red"}>
                {user.isActive ? "Ativo" : "Inativo"}
              </Tag>
            </Space>
            <Text type="secondary">{user.role?.name || "—"}</Text>
            {user.manager && (
              <div>
                <Text type="secondary">Gestor: {user.manager.name}</Text>
              </div>
            )}

            <Space style={{ marginTop: 12 }}>
              <Button icon={<EyeOutlined />} onClick={() => onView?.(user)}>
                Visualizar
              </Button>
              <Button icon={<ApartmentOutlined />} onClick={openModal}>
                Estrutura
              </Button>
            </Space>
          </div>
        </Space>
      </Card>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        title={`Estrutura — ${user.name}`}
        centered
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin />
          </div>
        ) : (
          <>
            <Title level={5}>Acima</Title>
            <List
              size="small"
              dataSource={estrutura.acima}
              locale={{ emptyText: "— nenhum gestor —" }}
              renderItem={(p) => (
                <List.Item>
                  <Text strong>{p.nome}</Text> — <Text type="secondary">{p.cargo}</Text>
                </List.Item>
              )}
            />

            <Title level={5} style={{ marginTop: 12 }}>Colaborador atual</Title>
            {estrutura.atual && (
              <List.Item>
                <Text strong>{estrutura.atual.nome}</Text> —{" "}
                <Text type="secondary">{estrutura.atual.cargo}</Text>
              </List.Item>
            )}

            <Title level={5} style={{ marginTop: 12 }}>Abaixo</Title>
            <List
              size="small"
              dataSource={estrutura.abaixo}
              locale={{ emptyText: "— nenhum subordinado —" }}
              renderItem={(p) => (
                <List.Item>
                  <Text strong>{p.nome}</Text> — <Text type="secondary">{p.cargo}</Text>
                </List.Item>
              )}
            />
          </>
        )}
      </Modal>
    </>
  );
}
