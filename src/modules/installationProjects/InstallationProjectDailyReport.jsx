import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Form,
  Switch,
  Button,
  message,
  Space,
  Divider,
  Tag,
  Radio,
  Alert,
  Typography,
  Input,
  Row,
  Col,
  Upload,
  Image,
  Card,
} from 'antd';
import {
  MailOutlined,
  SendOutlined,
  SaveOutlined,
  UploadOutlined,
} from '@ant-design/icons';

import { api } from '../../lib/api';

function normalizeEmails(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((e) => String(e || '').trim()).filter(Boolean);

  return String(input)
    .split(/[;,]/)
    .map((e) => e.trim())
    .filter(Boolean);
}

const DEFAULT_COLORS = {
  done: '#00c853',
  pending: '#2f7dbd',
  header: '#2f7dbd',
};

const DEFAULT_OMNILINK_LOGO = `https://app.projetos-rc.online/logo_branca.png`;

export default function InstallationProjectDailyReport({ project, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [sendingSimple, setSendingSimple] = useState(false);
  const [sendingComplete, setSendingComplete] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [form] = Form.useForm();

  const contactEmails = useMemo(() => {
    return normalizeEmails(
      project?.contactEmails?.length ? project.contactEmails : project?.contactEmail
    );
  }, [project]);

  useEffect(() => {
    if (!project || !open) return;

    form.setFieldsValue({
      dailyReportEnabled: !!project.dailyReportEnabled,
      dailyReportSendToClient: !!project.dailyReportSendToClient,
      dailyReportType: project.dailyReportType || 'simple',
      dailyReportColorDone: project.dailyReportColorDone || DEFAULT_COLORS.done,
      dailyReportColorPending: project.dailyReportColorPending || DEFAULT_COLORS.pending,
      dailyReportHeaderColor: project.dailyReportHeaderColor || DEFAULT_COLORS.header,
      dailyReportClientLogoUrl: project.dailyReportClientLogoUrl || '',
      dailyReportOmnilinkLogoUrl: project.dailyReportOmnilinkLogoUrl || DEFAULT_OMNILINK_LOGO,
    });
  }, [project, open, form]);

 const handleRemoveLogo = async () => {
  try {
    await api.delete(`/installation-projects/${project.id}/delete-daily-report-logo`, {
      data: {
        logoUrl: form.getFieldValue('dailyReportClientLogoUrl'),
      },
    });

    form.setFieldValue('dailyReportClientLogoUrl', null);

    message.success('Logo removida');

    if (onUpdated) await onUpdated();
  } catch (err) {
    message.error(
      err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Erro ao remover logo'
    );
  }
};
  const handleUploadLogo = async ({ file, onSuccess, onError }) => {
    try {
      setUploadingLogo(true);

      const oldLogo = form.getFieldValue('dailyReportClientLogoUrl');

      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post(
        `/installation-projects/${project.id}/upload-daily-report-logo`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const logoUrl =
        data?.data?.dailyReportClientLogoUrl ||
        data?.dailyReportClientLogoUrl;

      form.setFieldValue('dailyReportClientLogoUrl', logoUrl);


      message.success('Logo enviada com sucesso');

      if (onUpdated) await onUpdated();
      if (onSuccess) onSuccess(data);
    } catch (err) {
      message.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Erro ao enviar logo'
      );

      if (onError) onError(err);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      await api.patch(`/installation-projects/${project.id}/daily-report/settings`, {
        dailyReportEnabled: !!values.dailyReportEnabled,
        dailyReportSendToClient: true,
        dailyReportType: values.dailyReportType || 'simple',
        dailyReportColorDone: values.dailyReportColorDone || DEFAULT_COLORS.done,
        dailyReportColorPending: values.dailyReportColorPending || DEFAULT_COLORS.pending,
        dailyReportHeaderColor: values.dailyReportHeaderColor || DEFAULT_COLORS.header,
        dailyReportClientLogoUrl: values.dailyReportClientLogoUrl || null,
        dailyReportOmnilinkLogoUrl: values.dailyReportOmnilinkLogoUrl || DEFAULT_OMNILINK_LOGO,
      });

      message.success('Configuração salva com sucesso');

      if (onUpdated) await onUpdated();
    } catch (err) {
      if (err?.errorFields) return;

      message.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Erro ao salvar configuração'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (type) => {
    try {
      const values = form.getFieldsValue(true);

      const headerColor =
        values.dailyReportHeaderColor ||
        project?.dailyReportHeaderColor ||
        DEFAULT_COLORS.header;
      const isComplete = type === 'complete';

      if (isComplete) setSendingComplete(true);
      else setSendingSimple(true);

      await api.post(`/installation-projects/${project.id}/emails/daily`, {
        reportType: isComplete ? 'complete' : 'simple',
        sendAll: isComplete,
        date: new Date().toISOString().slice(0, 10),
        emailTo: contactEmails,
        dailyReportColorDone: values.dailyReportColorDone || DEFAULT_COLORS.done,
        dailyReportColorPending: values.dailyReportColorPending || DEFAULT_COLORS.pending,
        dailyReportHeaderColor: headerColor,
        dailyReportClientLogoUrl:
          (values.dailyReportClientLogoUrl || project.dailyReportClientLogoUrl || '')
            .replace('http://api.projetos-rc.online', 'https://api.projetos-rc.online') || null,

        dailyReportOmnilinkLogoUrl:
          values.dailyReportOmnilinkLogoUrl ||
          project.dailyReportOmnilinkLogoUrl ||
          DEFAULT_OMNILINK_LOGO,
      });

      message.success(
        isComplete
          ? 'Relatório completo enviado com sucesso'
          : 'Relatório simples enviado com sucesso'
      );

      if (onUpdated) await onUpdated();
    } catch (err) {
      message.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Erro ao enviar relatório'
      );
    } finally {
      setSendingSimple(false);
      setSendingComplete(false);
    }
  };

  const clientLogoUrl = Form.useWatch('dailyReportClientLogoUrl', form);
  const omnilinkLogoUrl = Form.useWatch('dailyReportOmnilinkLogoUrl', form);

  const handleRemoveEmail = async (emailToRemove) => {
    try {
      const nextEmails = contactEmails.filter(
        (e) => e !== emailToRemove
      );

      await api.patch(`/installation-projects/${project.id}`, {
        contactEmails: nextEmails,
        contactEmail: nextEmails[0] || null,
      });

      message.success('E-mail removido');

      if (onUpdated) await onUpdated();
    } catch (err) {
      message.error(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Erro ao remover e-mail'
      );
    }
  };
  
  const handleAddEmail = async () => {
    const email = String(newEmail || '').trim().toLowerCase();

    if (!email) {
      message.warning('Digite um e-mail');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      message.error('E-mail inválido');
      return;
    }

    if (contactEmails.includes(email)) {
      message.warning('Esse e-mail já está cadastrado');
      return;
    }

    try {
      setSavingEmail(true);

      const nextEmails = [...contactEmails, email];

      await api.patch(`/installation-projects/${project.id}`, {
        contactEmails: nextEmails,
        contactEmail: nextEmails[0],
      });

      message.success('E-mail adicionado com sucesso');
      setNewEmail('');

      if (onUpdated) await onUpdated();
    } catch (err) {
      message.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Erro ao adicionar e-mail'
      );
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <>
      <Space wrap>
        <Button icon={<MailOutlined />} onClick={() => setOpen(true)}>
          Relatório diário
        </Button>

        {project?.dailyReportEnabled ? (
          <Tag
            color="green"
            style={{
              height: 32,
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              fontSize: 14,
              borderRadius: 8,
            }}
          >
            Automático ativo • {project.dailyReportType === 'complete' ? 'Completo' : 'Simples'}
          </Tag>
        ) : (
          <Tag
            color="red"
            style={{
              height: 32,
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              fontSize: 14,
              borderRadius: 8,
            }}
          >
            E-mail Diario Inativo
          </Tag>
        )}
      </Space>

      <Modal
        open={open}
        title={
          <Space>
            <MailOutlined />
            Relatório diário do projeto
          </Space>
        }
        onCancel={() => setOpen(false)}
        footer={null}
        width={980}
        centered
        styles={{
          body: {
            paddingTop: 12,
          },
        }}
      >
        <Form form={form} layout="vertical">
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Os e-mails serão usados a partir do cadastro de contato do projeto."
          />

        <Card size="small" style={{ borderRadius: 12, marginBottom: 16 }}>
          <Typography.Text strong>E-mails de contato cadastrados</Typography.Text>

          <div style={{ marginTop: 10 }}>
            {contactEmails.length ? (
              <Space wrap>
                {contactEmails.map((email) => (
                  <Tag
                    key={email}
                    color="blue"
                    closable
                    onClose={(e) => {
                      e.preventDefault();

                      Modal.confirm({
                        title: 'Remover e-mail?',
                        content: email,
                        okText: 'Remover',
                        cancelText: 'Cancelar',
                        onOk: () => handleRemoveEmail(email),
                      });
                    }}
                  >
                    {email}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Tag color="red">Nenhum e-mail de contato cadastrado</Tag>
            )}
          </div>

          <Space.Compact style={{ width: '100%', marginTop: 12 }}>
            <Input
              value={newEmail}
              placeholder="Adicionar novo e-mail"
              onChange={(e) => setNewEmail(e.target.value)}
              onPressEnter={handleAddEmail}
            />

            <Button
              type="primary"
              loading={savingEmail}
              onClick={handleAddEmail}
            >
              Adicionar
            </Button>
          </Space.Compact>
        </Card>

          <Row gutter={16}>
            {/* ESQUERDA */}
              <Col xs={24} lg={12}>
                <Card
                  size="small"
                  title="Configuração de envio"
                  style={{ borderRadius: 12, height: '100%' }}
                >
                  <Row gutter={16}>
                    <Col xs={24}>
                      <Form.Item
                        label="Envio diário automático"
                        name="dailyReportEnabled"
                        valuePropName="checked"
                      >
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <Switch
                            checkedChildren="Ativo"
                            unCheckedChildren="Inativo"
                            style={{ minWidth: 100 }}
                          />
                        </div>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    label="Tipo de relatório automático"
                    name="dailyReportType"
                    rules={[
                      { required: true, message: 'Selecione o tipo de relatório' },
                    ]}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <Radio.Group
                        size="large"
                        style={{
                          display: 'flex',
                          width: '100%',
                          maxWidth: 400,
                        }}
                      >
                        <Radio.Button
                          value="simple"
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            borderRadius: '8px 0 0 8px',
                          }}
                        >
                          Simples
                        </Radio.Button>

                        <Radio.Button
                          value="complete"
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            borderRadius: '0 8px 8px 0',
                          }}
                        >
                          Completo detalhado
                        </Radio.Button>
                      </Radio.Group>
                    </div>
                  </Form.Item>

                  <Divider style={{ margin: '12px 0' }} />

                    <Alert
                      type="info"
                      showIcon
                      style={{
                        marginTop: 8,
                        borderRadius: 8,
                        textAlign: 'center',
                        fontSize: 14,
                      }}
                      message="O envio automático utiliza o tipo de relatório selecionado acima quando executado."
                    />
                </Card>
              </Col>

            {/* DIREITA */}
            <Col xs={24} lg={12}>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                
                {/* CORES */}
                <Card size="small" title="Cores do relatório" style={{ borderRadius: 12 }}>
                  <Row gutter={[10, 10]}>
                    {[
                      ['Concluído', 'dailyReportColorDone'],
                      ['Pendente', 'dailyReportColorPending'],
                      ['Cabeçalho', 'dailyReportHeaderColor'],
                    ].map(([label, name]) => (
                      <Col xs={24} md={8} key={name}>
                        <Form.Item label={label} name={name} style={{ marginBottom: 4 }}>
                          <Input
                            type="color"
                            style={{
                              width: '100%',
                              height: 44,
                              padding: 4,
                              borderRadius: 10,
                              cursor: 'pointer',
                            }}
                          />
                        </Form.Item>
                      </Col>
                    ))}
                  </Row>

                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Clique na cor para personalizar. Se não alterar, usa o padrão.
                  </Typography.Text>
                </Card>

                {/* LOGO */}
                <Card size="small" title="Logo do cliente" style={{ borderRadius: 12 }}>
                  <Form.Item name="dailyReportClientLogoUrl" hidden>
                    <Input />
                  </Form.Item>

                  <Space direction="vertical" size={10} style={{ width: '100%' }}>
                    <Upload
                      customRequest={handleUploadLogo}
                      showUploadList={false}
                      accept="image/png,image/jpeg,image/jpg"
                    >
                      <Button icon={<UploadOutlined />} loading={uploadingLogo}>
                        Enviar logo do cliente
                      </Button>
                    </Upload>

                    <div
                      style={{
                        minHeight: 74,
                        border: '1px dashed #d9d9d9',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#fafafa',
                        padding: 10,
                        position: 'relative',
                      }}
                    >
                      {clientLogoUrl ? (
                        <>
                          <Image
                            src={clientLogoUrl}
                            height={54}
                            preview={false}
                            style={{ objectFit: 'contain' }}
                          />

                          <Button
                            danger
                            size="small"
                            style={{
                              position: 'absolute',
                              top: 6,
                              right: 6,
                            }}
                            onClick={handleRemoveLogo}
                          >
                            Remover
                          </Button>
                        </>
                      ) : (
                        <Typography.Text type="secondary">
                          Nenhuma logo enviada.
                        </Typography.Text>
                      )}
                    </div>
                  </Space>
                </Card>

              </Space>
            </Col>
          </Row>
          <Divider />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              Salvar configuração
            </Button>

            <Space wrap>
              <Button
                icon={<SendOutlined />}
                loading={sendingSimple}
                disabled={!contactEmails.length}
                onClick={() => handleSend('simple')}
              >
                Enviar simples agora
              </Button>

              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={sendingComplete}
                disabled={!contactEmails.length}
                onClick={() => handleSend('complete')}
              >
                Enviar completo agora
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </>
  );
}