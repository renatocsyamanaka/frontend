import React, { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Grid,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  EyeInvisibleOutlined,
  EyeTwoTone,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  ToolOutlined,
  UploadOutlined,
  UserAddOutlined,
  UserOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useAuth } from './AuthProvider';
import { api } from '../../lib/api';
import { MaskedInput } from 'antd-mask-input';

const onlyDigits = (v?: string) => String(v || '').replace(/\D/g, '');

const phoneMask = (value?: string) => {
  const digits = onlyDigits(value);
  return digits.length > 10 ? '(00) 00000-0000' : '(00) 0000-0000';
};

const ALLOWED_DOMAINS = [
  'omnilink.com.br',
  'showtecnologia.com.br',
  'noriomomoi.com.br',
];

const validateCorporateEmail = (_: any, value: string) => {
  if (!value) return Promise.reject(new Error('Informe seu e-mail'));

  const parts = String(value).toLowerCase().trim().split('@');
  const domain = parts[1];

  if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
    return Promise.reject(
      new Error(
        'Use um e-mail corporativo válido: @omnilink.com.br, @showtecnologia.com.br ou @noriomomoi.com.br'
      )
    );
  }

  return Promise.resolve();
};

export function LoginPage() {
  const { login } = useAuth();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [loginForm] = Form.useForm();
  const [signupForm] = Form.useForm();

  const [signupOpen, setSignupOpen] = useState(false);
  const [signupAvatarFile, setSignupAvatarFile] = useState<File | null>(null);
  const [sendingSignup, setSendingSignup] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const signupPhone = Form.useWatch('phone', signupForm);

  const brandPrimary = '#2F5DAA';
  const brandSecondary = '#2D74BF';
  const brandAccent = '#F4A62A';
  const bgPage = '#F5F7FA';
  const bgCard = '#FFFFFF';
  const bgSoft = '#F9FAFB';
  const borderColor = '#E5E7EB';
  const borderBlue = '#D6E4FF';
  const textPrimary = '#1F2937';
  const textSecondary = '#6B7280';

  const onFinish = async (values: any) => {
    try {
      setLoggingIn(true);
      setLoginError('');

      await login(values.email, values.password);
      message.success('Bem-vindo!');
      location.href = '/';
    } catch (e: any) {
      const errorMessage = e?.response?.data?.error || 'Falha no login';
      setLoginError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoggingIn(false);
    }
  };

  const onSubmitSignup = async (values: any) => {
    try {
      setSendingSignup(true);

      const fd = new FormData();
      fd.append('fullName', values.fullName);
      fd.append('email', values.email);
      fd.append('password', values.password);
      fd.append('sex', values.sex || '');
      fd.append('phone', values.phone || '');

      if (signupAvatarFile) {
        fd.append('avatar', signupAvatarFile);
      }

      await api.post('/user-registration-requests', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      message.success('Solicitação enviada com sucesso. Aguarde a aprovação do gestor.');
      setSignupOpen(false);
      signupForm.resetFields();
      setSignupAvatarFile(null);
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Não foi possível enviar sua solicitação');
    } finally {
      setSendingSignup(false);
    }
  };

  const infoItems = [
    {
      icon: <InboxOutlined />,
      title: 'Acompanhamento de pedidos',
      description: 'Consulte solicitações e acompanhe o andamento operacional.',
    },
    {
      icon: <FileTextOutlined />,
      title: 'Solicitação de peças',
      description: 'Abra e acompanhe pedidos de peças com mais rapidez.',
    },
    {
      icon: <AppstoreOutlined />,
      title: 'Gestão e apoio operacional',
      description: 'Centralize acessos e informações do portal em um só lugar.',
    },
  ];

  return (
    <>
      <div
        style={{
          minHeight: '100vh',
          background: bgPage,
          padding: isMobile ? 16 : 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: '100%', maxWidth: 1180 }}>
          <Row gutter={isMobile ? [0, 16] : [32, 32]} align="middle">
            {!isMobile && (
              <Col xs={24} md={12} lg={13}>
                <div style={{ paddingRight: 12 }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 16px',
                      borderRadius: 999,
                      background: '#FFFFFF',
                      border: `1px solid ${borderColor}`,
                      marginBottom: 22,
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: brandAccent,
                      }}
                    />
                    <Typography.Text
                      style={{
                        color: brandPrimary,
                        fontWeight: 600,
                        fontSize: 14,
                      }}
                    >
                      Portal de Supply Chain
                    </Typography.Text>
                  </div>

                  <Typography.Title
                    level={1}
                    style={{
                      color: brandPrimary,
                      margin: 0,
                      lineHeight: 1.1,
                      fontSize: 48,
                      maxWidth: 620,
                      fontWeight: 700,
                    }}
                  >
                    Acesse o portal de forma simples e organizada.
                  </Typography.Title>

                  <div
                    style={{
                      width: 90,
                      height: 5,
                      background: brandAccent,
                      borderRadius: 999,
                      margin: '18px 0 22px',
                    }}
                  />

                  <Typography.Paragraph
                    style={{
                      color: textSecondary,
                      fontSize: 18,
                      lineHeight: 1.7,
                      maxWidth: 640,
                      marginBottom: 28,
                    }}
                  >
                    Acompanhe pedidos, consulte solicitações, acesse o portal de peças
                    e encontre informações importantes para o suporte às operações
                    logísticas da empresa.
                  </Typography.Paragraph>

                  <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 640 }}>
                    {infoItems.map((item) => (
                      <Card
                        key={item.title}
                        style={{
                          borderRadius: 16,
                          border: `1px solid ${borderColor}`,
                          background: '#FFFFFF',
                          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
                        }}
                        styles={{
                          body: {
                            padding: 18,
                          },
                        }}
                      >
                        <Space align="start" size={14}>
                          <div
                            style={{
                              width: 46,
                              height: 46,
                              borderRadius: 12,
                              background: '#EEF4FF',
                              color: brandPrimary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20,
                              flexShrink: 0,
                            }}
                          >
                            {item.icon}
                          </div>

                          <div>
                            <Typography.Text
                              style={{
                                display: 'block',
                                color: textPrimary,
                                fontWeight: 700,
                                fontSize: 16,
                                marginBottom: 4,
                              }}
                            >
                              {item.title}
                            </Typography.Text>

                            <Typography.Text
                              style={{
                                color: textSecondary,
                                fontSize: 14,
                                lineHeight: 1.6,
                              }}
                            >
                              {item.description}
                            </Typography.Text>
                          </div>
                        </Space>
                      </Card>
                    ))}
                  </Space>
                </div>
              </Col>
            )}

            <Col xs={24} md={12} lg={11}>
              <Card
                style={{
                  width: '100%',
                  maxWidth: 460,
                  margin: '0 auto',
                  borderRadius: 22,
                  border: `1px solid ${borderColor}`,
                  background: bgCard,
                  boxShadow: '0 16px 42px rgba(15, 23, 42, 0.08)',
                }}
                styles={{
                  body: {
                    padding: isMobile ? 22 : 30,
                  },
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: 22 }}>
                  <img
                    src="/logo.png"
                    alt="Omnilink"
                    style={{
                      height: isMobile ? 58 : 70,
                      maxWidth: '80%',
                      objectFit: 'contain',
                      display: 'block',
                      margin: '0 auto 12px',
                    }}
                  />

                  <Typography.Title
                    level={2}
                    style={{
                      margin: 0,
                      color: brandPrimary,
                      fontSize: isMobile ? 28 : 32,
                      fontWeight: 700,
                    }}
                  >
                    Portal de Supply Chain
                  </Typography.Title>

                  <div
                    style={{
                      width: 60,
                      height: 4,
                      background: brandAccent,
                      borderRadius: 999,
                      margin: '10px auto 14px',
                    }}
                  />

                  <Typography.Text
                    style={{
                      color: textSecondary,
                      fontSize: 15,
                      lineHeight: 1.6,
                      display: 'block',
                    }}
                  >
                    Acesse o portal para acompanhar pedidos, solicitações,
                    status operacionais e recursos de apoio logístico.
                  </Typography.Text>
                </div>

                {loginError ? (
                  <Alert
                    showIcon
                    type="error"
                    message="Erro ao acessar"
                    description={loginError}
                    style={{
                      marginBottom: 18,
                      borderRadius: 10,
                      background: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      marginBottom: 18,
                      borderRadius: 12,
                      padding: '12px 14px',
                      background: '#F8FBFF',
                      border: `1px solid ${borderBlue}`,
                    }}
                  >
                    <Typography.Text
                      style={{
                        color: textSecondary,
                        fontSize: 13,
                        lineHeight: 1.55,
                      }}
                    >
                      Utilize seu e-mail corporativo para entrar no sistema com segurança.
                    </Typography.Text>
                  </div>
                )}

                <Form
                  form={loginForm}
                  layout="vertical"
                  onFinish={onFinish}
                  onValuesChange={() => {
                    if (loginError) setLoginError('');
                  }}
                >
                  <Form.Item
                    name="email"
                    label={<span style={{ color: textPrimary, fontWeight: 600 }}>E-mail</span>}
                    rules={[
                      { required: true, message: 'Informe seu e-mail' },
                      { type: 'email', message: 'Informe um e-mail válido' },
                    ]}
                  >
                    <Input
                      size="large"
                      placeholder="seuemail@empresa.com"
                      prefix={<MailOutlined style={{ color: textSecondary }} />}
                      autoComplete="email"
                      style={{
                        borderRadius: 10,
                        height: 46,
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    label={<span style={{ color: textPrimary, fontWeight: 600 }}>Senha</span>}
                    rules={[{ required: true, message: 'Informe sua senha' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Input.Password
                      size="large"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      prefix={<LockOutlined style={{ color: textSecondary }} />}
                      iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                      style={{
                        borderRadius: 10,
                        height: 46,
                      }}
                    />
                  </Form.Item>

                  <Space direction="vertical" size={10} style={{ width: '100%', marginTop: 10 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      block
                      loading={loggingIn}
                      disabled={loggingIn}
                      style={{
                        height: 46,
                        border: 'none',
                        borderRadius: 10,
                        background: brandPrimary,
                        boxShadow: '0 8px 20px rgba(47, 93, 170, 0.18)',
                        fontWeight: 600,
                      }}
                    >
                      {loggingIn ? 'Entrando...' : 'Entrar'}
                    </Button>

                    <Button
                      size="large"
                      block
                      icon={<UserAddOutlined />}
                      onClick={() => setSignupOpen(true)}
                      style={{
                        height: 46,
                        borderRadius: 10,
                        fontWeight: 500,
                        borderColor: borderColor,
                      }}
                    >
                      Cadastre-se
                    </Button>
                  </Space>

                  <Divider style={{ margin: '18px 0 16px' }}>
                    <Typography.Text style={{ color: textSecondary, fontSize: 12 }}>
                      acesso rápido
                    </Typography.Text>
                  </Divider>

                  <Card
                    size="small"
                    style={{
                      borderRadius: 14,
                      border: `1px solid ${borderColor}`,
                      background: bgSoft,
                    }}
                    styles={{
                      body: {
                        padding: 14,
                      },
                    }}
                  >
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                      <Button
                        size="large"
                        block
                        icon={<ToolOutlined />}
                        onClick={() => {
                          location.href = '/solicitar-peca';
                        }}
                        style={{
                          height: 44,
                          borderRadius: 10,
                        }}
                      >
                        Acessar portal de peças
                      </Button>

                      <Typography.Text
                        style={{
                          display: 'block',
                          textAlign: 'center',
                          fontSize: 12,
                          color: textSecondary,
                          lineHeight: 1.55,
                        }}
                      >
                        Faça uma solicitação ou acompanhe um pedido sem precisar entrar no sistema.
                      </Typography.Text>
                    </Space>
                  </Card>

                  {isMobile && (
                    <Card
                      size="small"
                      style={{
                        marginTop: 16,
                        borderRadius: 14,
                        border: `1px solid ${borderColor}`,
                        background: '#FFFFFF',
                      }}
                      styles={{
                        body: {
                          padding: 14,
                        },
                      }}
                    >
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Typography.Text
                          style={{
                            color: brandPrimary,
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          O que você encontra aqui
                        </Typography.Text>

                        <Space size={10} align="start">
                          <CheckCircleOutlined style={{ color: brandAccent, marginTop: 3 }} />
                          <Typography.Text style={{ color: textSecondary }}>
                            Acompanhamento de pedidos e solicitações
                          </Typography.Text>
                        </Space>

                        <Space size={10} align="start">
                          <CheckCircleOutlined style={{ color: brandAccent, marginTop: 3 }} />
                          <Typography.Text style={{ color: textSecondary }}>
                            Acesso rápido ao portal de peças
                          </Typography.Text>
                        </Space>

                        <Space size={10} align="start">
                          <CheckCircleOutlined style={{ color: brandAccent, marginTop: 3 }} />
                          <Typography.Text style={{ color: textSecondary }}>
                            Informações de apoio às operações logísticas
                          </Typography.Text>
                        </Space>
                      </Space>
                    </Card>
                  )}
                </Form>
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      <Modal
        title="Pré-cadastro"
        open={signupOpen}
        onCancel={() => {
          setSignupOpen(false);
          signupForm.resetFields();
          setSignupAvatarFile(null);
        }}
        onOk={() => signupForm.submit()}
        okText="Enviar solicitação"
        cancelText="Cancelar"
        confirmLoading={sendingSignup}
        destroyOnHidden
        width={isMobile ? '100%' : 760}
        style={isMobile ? { top: 0, padding: 0 } : undefined}
      >
        <div
          style={{
            marginBottom: 16,
            padding: 14,
            borderRadius: 10,
            background: '#F8FBFF',
            border: `1px solid ${borderBlue}`,
          }}
        >
          <Typography.Text style={{ color: textSecondary }}>
            Preencha seus dados. Sua solicitação será enviada para aprovação.
            Cargo e gestor serão definidos no momento da aprovação.
          </Typography.Text>
        </div>

        <Form layout="vertical" form={signupForm} onFinish={onSubmitSignup}>
          <Form.Item
            name="fullName"
            label="Nome completo"
            rules={[{ required: true, message: 'Informe seu nome completo' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Digite seu nome completo"
              style={{ borderRadius: 10, height: 42 }}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="E-mail corporativo"
            rules={[
              { required: true, message: 'Informe seu e-mail' },
              { type: 'email', message: 'Informe um e-mail válido' },
              { validator: validateCorporateEmail },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="seunome@omnilink.com.br"
              style={{ borderRadius: 10, height: 42 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Senha"
            rules={[
              { required: true, message: 'Informe uma senha' },
              { min: 6, message: 'A senha deve ter no mínimo 6 caracteres' },
            ]}
          >
            <Input.Password
              placeholder="Crie uma senha"
              prefix={<LockOutlined />}
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              style={{ borderRadius: 10, height: 42 }}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="sex" label="Sexo">
                <Select
                  allowClear
                  placeholder="Selecione"
                  options={[
                    { value: 'M', label: 'Masculino' },
                    { value: 'F', label: 'Feminino' },
                    { value: 'O', label: 'Outro' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="phone"
                label="Telefone"
                rules={[{ required: true, message: 'Informe seu telefone' }]}
              >
                <MaskedInput
                  mask={phoneMask(signupPhone)}
                  prefix={<PhoneOutlined />}
                  placeholder="(11) 99999-9999"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Foto (opcional)">
            <Upload
              accept="image/jpeg,image/png,image/webp"
              maxCount={1}
              beforeUpload={(file) => {
                setSignupAvatarFile(file);
                return false;
              }}
              onRemove={() => setSignupAvatarFile(null)}
              listType="picture"
            >
              <Button icon={<UploadOutlined />} style={{ borderRadius: 10 }}>
                Selecionar foto
              </Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}