import { Modal, Tag, Typography } from 'antd';

const { Text } = Typography;

export default function UserMapModal(props) {
  const { open, onClose, title, lat, lng, addressLabel } = props;

  const _lat = lat === null || lat === undefined || lat === '' ? null : Number(lat);
  const _lng = lng === null || lng === undefined || lng === '' ? null : Number(lng);

  const hasCoords = Number.isFinite(_lat) && Number.isFinite(_lng);

  const src = hasCoords
    ? `https://www.google.com/maps?q=${_lat},${_lng}&z=16&output=embed`
    : '';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={980}
      title={title || 'Mapa'}
      destroyOnHidden
    >
      {!hasCoords ? (
        <Text type="secondary">Sem coordenadas para este usuário.</Text>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {addressLabel ? <Text>{addressLabel}</Text> : null}
            <Tag color="green">{_lat}, {_lng}</Tag>
          </div>

          <div
            style={{
              width: '100%',
              height: 520,
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #f0f0f0',
            }}
          >
            <iframe
              title="Mapa"
              src={src}
              width="100%"
              height="520"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
