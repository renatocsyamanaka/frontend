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

  const handleUploadLogo = async ({ file, onSuccess, onError }) => {
    try {
      setUploadingLogo(true);

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
        dailyReportSendToClient: !!values.dailyReportSendToClient,
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
      const values = form.getFieldsValue();
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
        dailyReportHeaderColor: values.dailyReportHeaderColor || DEFAULT_COLORS.header,
        dailyReportClientLogoUrl: null,
        dailyReportOmnilinkLogoUrl: null,
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

  return (
    <>
      <Space wrap>
        <Button icon={<MailOutlined />} onClick={() => setOpen(true)}>
          Relatório diário
        </Button>

        {project?.dailyReportEnabled ? (
          <Tag color="green">
            Automático ativo • {project.dailyReportType === 'complete' ? 'Completo' : 'Simples'}
          </Tag>
        ) : (
          <Tag>Automático inativo</Tag>
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
                    <Tag key={email} color="blue">
                      {email}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Tag color="red">Nenhum e-mail de contato cadastrado</Tag>
              )}
            </div>
          </Card>

          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card
                size="small"
                title="Configuração de envio"
                style={{ borderRadius: 12, height: '100%' }}
              >
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Envio diário automático"
                      name="dailyReportEnabled"
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="Ativo" unCheckedChildren="Inativo" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Enviar para cliente"
                      name="dailyReportSendToClient"
                      valuePropName="checked"
                    >
                      <Switch
                        checkedChildren="Sim"
                        unCheckedChildren="Não"
                        disabled={!contactEmails.length}
                      />
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
                  <Radio.Group>
                    <Radio.Button value="simple">Simples</Radio.Button>
                    <Radio.Button value="complete">Completo detalhado</Radio.Button>
                  </Radio.Group>
                </Form.Item>

                <Divider style={{ margin: '12px 0' }} />

                <Typography.Text type="secondary">
                  O envio automático usa o tipo selecionado acima quando o agendador diário executar.
                </Typography.Text>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                size="small"
                title="Cores do relatório"
                style={{ borderRadius: 12, height: '100%' }}
              >
                <Row gutter={12}>
                  <Col xs={24} md={8}>
                    <Form.Item label="Concluído" name="dailyReportColorDone">
                      <Input type="color" style={{ height: 38 }} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Pendente" name="dailyReportColorPending">
                      <Input type="color" style={{ height: 38 }} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Cabeçalho" name="dailyReportHeaderColor">
                      <Input type="color" style={{ height: 38 }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Typography.Text type="secondary">
                  As cores são usadas apenas no relatório completo com gráficos.
                </Typography.Text>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card
                size="small"
                title="Logo do cliente"
                style={{ borderRadius: 12, height: '100%' }}
              >
                <Form.Item name="dailyReportClientLogoUrl">
                  <Input placeholder="URL gerada após upload" disabled />
                </Form.Item>

                <Space direction="vertical" style={{ width: '100%' }}>
                  <Upload
                    customRequest={handleUploadLogo}
                    showUploadList={false}
                    accept="image/*"
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
                    }}
                  >
                    {clientLogoUrl ? (
                      <Image
                        src={clientLogoUrl}
                        height={54}
                        preview={false}
                        style={{ objectFit: 'contain' }}
                      />
                    ) : (
                      <Typography.Text type="secondary">
                        Nenhuma logo enviada.
                      </Typography.Text>
                    )}
                  </div>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                size="small"
                title="Logo Omnilink"
                style={{ borderRadius: 12, height: '100%' }}
              >
                <Form.Item
                  name="dailyReportOmnilinkLogoUrl"
                  tooltip="Para e-mail externo, use uma URL pública. Localhost funciona apenas localmente."
                >
                  <Input placeholder="Ex: https://seu-front.com/logo.png" />
                </Form.Item>

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
                  }}
                >
                  {omnilinkLogoUrl ? (
                    <Image
                      src={omnilinkLogoUrl}
                      height={54}
                      preview={false}
                      style={{ objectFit: 'contain' }}
                    />
                  ) : (
                    <Typography.Text type="secondary">
                      Informe a URL da logo Omnilink.
                    </Typography.Text>
                  )}
                </div>
              </Card>
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