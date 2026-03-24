import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Divider,
  Form,
  Input,
  Modal,
  Space,
  Tabs,
  Typography,
  Upload,
  message,
  Card,
  Progress,
  Row,
  Col,
} from 'antd';
import {
  CameraOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { api } from '../../lib/api';

const { Text } = Typography;

function normalizeAvatar(url) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;

  const base = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  return base ? `${base}/${String(url).replace(/^\/+/, '')}` : url;
}

function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);

  if (!digits) return '';

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{0,2})/, '($1')
      .replace(/^(\(\d{2})(\d{0,4})/, '$1) $2')
      .replace(/(\d{4})(\d{0,4})$/, '$1-$2');
  }

  return digits
    .replace(/^(\d{0,2})/, '($1')
    .replace(/^(\(\d{2})(\d{0,5})/, '$1) $2')
    .replace(/(\d{5})(\d{0,4})$/, '$1-$2');
}

function getPasswordChecks(password) {
  const value = String(password || '');

  return {
    minLength: value.length >= 8,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
  };
}

function getPasswordStrength(password) {
  const checks = getPasswordChecks(password);
  const passed = Object.values(checks).filter(Boolean).length;

  if (!password) return { percent: 0, label: 'Não informada' };
  if (passed <= 2) return { percent: 25, label: 'Fraca' };
  if (passed === 3) return { percent: 50, label: 'Média' };
  if (passed === 4) return { percent: 75, label: 'Boa' };
  return { percent: 100, label: 'Forte' };
}

function Requirement({ ok, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {ok ? (
        <CheckCircleFilled style={{ color: '#16a34a' }} />
      ) : (
        <CloseCircleFilled style={{ color: '#dc2626' }} />
      )}
      <Text style={{ color: ok ? '#166534' : '#991b1b' }}>{text}</Text>
    </div>
  );
}

function getDisplayRoleLabel(profile) {
  if (!profile) return '-';
  if (profile?.ocultarCargo) return 'Oculto';
  return profile?.cargoDescritivo?.trim() || profile?.role?.name || '-';
}

export default function ProfileModal({ open, onClose, currentUser, onUpdated }) {
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const [profile, setProfile] = useState(currentUser || null);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploading, setUploading] = useState(false);

  const newPasswordValue = Form.useWatch('newPassword', passwordForm);
  const passwordChecks = useMemo(() => getPasswordChecks(newPasswordValue), [newPasswordValue]);
  const passwordStrength = useMemo(() => getPasswordStrength(newPasswordValue), [newPasswordValue]);

  useEffect(() => {
    if (!open) return;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/users/me/profile');
        const user = data?.data || data;

        setProfile(user);

        profileForm.setFieldsValue({
          phone: formatPhone(user?.phone || ''),
        });

        passwordForm.resetFields();
      } catch (err) {
        message.error(err?.response?.data?.error || 'Erro ao carregar perfil');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [open, profileForm, passwordForm]);

  const avatarSrc = useMemo(() => normalizeAvatar(profile?.avatarUrl), [profile]);
  const displayCargo = useMemo(() => getDisplayRoleLabel(profile), [profile]);

  const handleSaveProfile = async () => {
    try {
      const values = await profileForm.validateFields();
      setSavingProfile(true);

      const payload = {
        phone: String(values?.phone || '').replace(/\D/g, ''),
      };

      const { data } = await api.patch('/users/me/profile', payload);
      const updated = data?.data || data;

      setProfile(updated);
      onUpdated?.(updated);
      message.success('Perfil atualizado com sucesso');
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.error || 'Erro ao atualizar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields();
      setSavingPassword(true);

      await api.put('/users/me/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmNewPassword: values.confirmPassword,
      });

      message.success('Senha alterada com sucesso');
      passwordForm.resetFields();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.error || 'Erro ao alterar senha');
    } finally {
      setSavingPassword(false);
    }
  };

  const customUpload = async ({ file, onSuccess, onError }) => {
    try {
      setUploading(true);

      const fd = new FormData();
      fd.append('file', file);

      const { data } = await api.post('/users/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updated = data?.data || data;

      setProfile(updated);
      onUpdated?.(updated);
      message.success('Foto atualizada com sucesso');
      onSuccess?.(updated);
    } catch (err) {
      message.error(err?.response?.data?.error || 'Erro ao enviar foto');
      onError?.(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      title="Meu Perfil"
      destroyOnClose
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <Avatar
          size={88}
          src={avatarSrc}
          icon={<UserOutlined />}
          style={{ background: '#1F71B8' }}
        />

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#16324F' }}>
            {profile?.name || 'Usuário'}
          </div>

          <Space direction="vertical" size={2} style={{ marginTop: 6 }}>
            <Text type="secondary">
              <MailOutlined style={{ marginRight: 8 }} />
              {profile?.email || '-'}
            </Text>

            <Text type="secondary">
              <PhoneOutlined style={{ marginRight: 8 }} />
              {profile?.phone ? formatPhone(profile.phone) : 'Sem telefone'}
            </Text>

            <Text type="secondary">Cargo: {displayCargo}</Text>
          </Space>
        </div>

        <Upload
          accept=".jpg,.jpeg,.png,.webp"
          showUploadList={false}
          customRequest={customUpload}
          disabled={uploading}
        >
          <Button icon={<CameraOutlined />} loading={uploading}>
            Alterar foto
          </Button>
        </Upload>
      </div>

      <Divider />

      <Tabs
        defaultActiveKey="perfil"
        items={[
          {
            key: 'perfil',
            label: 'Perfil',
            children: (
              <Card bordered={false} styles={{ body: { padding: 0 } }}>
                <Form form={profileForm} layout="vertical" disabled={loading}>
                  <Form.Item label="Nome">
                    <Input value={profile?.name || ''} disabled />
                  </Form.Item>

                  <Form.Item label="E-mail">
                    <Input value={profile?.email || ''} disabled />
                  </Form.Item>

                  <Form.Item label="Cargo">
                    <Input value={displayCargo} disabled />
                  </Form.Item>

                  <Form.Item
                    label="Telefone"
                    name="phone"
                    rules={[{ required: true, message: 'Informe o telefone' }]}
                    getValueFromEvent={(e) => formatPhone(e?.target?.value || '')}
                  >
                    <Input placeholder="(11) 99999-9999" maxLength={15} />
                  </Form.Item>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <Button type="primary" onClick={handleSaveProfile} loading={savingProfile}>
                      Salvar perfil
                    </Button>
                  </div>
                </Form>
              </Card>
            ),
          },
          {
            key: 'seguranca',
            label: 'Segurança',
            children: (
              <Row gutter={[16, 16]} align="top">
                <Col xs={24} lg={15}>
                  <Card
                    bordered={false}
                    style={{
                      borderRadius: 16,
                      border: '1px solid #eef2f7',
                      boxShadow: '0 6px 24px rgba(15, 23, 42, 0.04)',
                      height: '100%',
                    }}
                  >
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#16324F' }}>
                        Alterar senha
                      </div>
                      <Text type="secondary">
                        Escolha uma senha forte para proteger sua conta.
                      </Text>
                    </div>

                    <Form form={passwordForm} layout="vertical">
                      <Form.Item
                        label="Senha atual"
                        name="currentPassword"
                        rules={[{ required: true, message: 'Informe a senha atual' }]}
                      >
                        <Input.Password placeholder="Digite sua senha atual" />
                      </Form.Item>

                      <Form.Item
                        label="Nova senha"
                        name="newPassword"
                        rules={[
                          { required: true, message: 'Informe a nova senha' },
                          {
                            validator(_, value) {
                              const checks = getPasswordChecks(value);
                              const valid = Object.values(checks).every(Boolean);

                              if (!value || valid) return Promise.resolve();
                              return Promise.reject(
                                new Error('A senha deve atender a todos os requisitos.')
                              );
                            },
                          },
                        ]}
                      >
                        <Input.Password placeholder="Digite a nova senha" />
                      </Form.Item>

                      <Form.Item
                        label="Confirmar nova senha"
                        name="confirmPassword"
                        dependencies={['newPassword']}
                        rules={[
                          { required: true, message: 'Confirme a nova senha' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue('newPassword') === value) {
                                return Promise.resolve();
                              }
                              return Promise.reject(new Error('As senhas não coincidem'));
                            },
                          }),
                        ]}
                      >
                        <Input.Password placeholder="Confirme a nova senha" />
                      </Form.Item>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <Button
                          type="primary"
                          icon={<LockOutlined />}
                          onClick={handleChangePassword}
                          loading={savingPassword}
                          style={{
                            borderRadius: 10,
                            minWidth: 170,
                          }}
                        >
                          Alterar senha
                        </Button>
                      </div>
                    </Form>
                  </Card>
                </Col>

                <Col xs={24} lg={9}>
                  <Card
                    bordered={false}
                    style={{
                      background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
                      border: '1px solid #dbeafe',
                      borderRadius: 16,
                      boxShadow: '0 6px 24px rgba(37, 99, 235, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <SafetyCertificateOutlined style={{ fontSize: 20, color: '#2563eb' }} />
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#16324F' }}>
                        Regras da senha
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                      <Requirement ok={passwordChecks.minLength} text="Pelo menos 8 caracteres" />
                      <Requirement ok={passwordChecks.upper} text="1 letra maiúscula" />
                      <Requirement ok={passwordChecks.lower} text="1 letra minúscula" />
                      <Requirement ok={passwordChecks.number} text="1 número" />
                      <Requirement ok={passwordChecks.special} text="1 caractere especial" />
                    </div>

                    <div
                      style={{
                        padding: 12,
                        background: 'rgba(255,255,255,0.72)',
                        border: '1px solid #e5eefc',
                        borderRadius: 12,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                        }}
                      >
                        <Text strong>Força</Text>
                        <Text type="secondary">{passwordStrength.label}</Text>
                      </div>

                      <Progress
                        percent={passwordStrength.percent}
                        showInfo={false}
                        strokeLinecap="round"
                      />
                    </div>
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </Modal>
  );
}