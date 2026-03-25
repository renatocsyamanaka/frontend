import React from 'react';
import { Card, Typography } from 'antd';

const { Text } = Typography;

export function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  accent,
  prefix,
  suffix,
  precision,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  accent: string;
  prefix?: string;
  suffix?: string;
  precision?: number;
}) {
  const isNumber = typeof value === 'number';

  const formattedValue =
    isNumber && typeof precision === 'number'
      ? Number(value).toLocaleString('pt-BR', {
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        })
      : isNumber
      ? Number(value).toLocaleString('pt-BR')
      : String(value);

  return (
    <Card
      variant={false}
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
        border: '1px solid #eef2f7',
        height: '100%',
      }}
      styles={{ body: { padding: 18 } }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: '#64748b',
              fontSize: 13,
              fontWeight: 500,
              display: 'block',
              marginBottom: 8,
            }}
          >
            {title}
          </Text>

          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}
          >
            {prefix ? `${prefix} ` : ''}
            {formattedValue}
            {suffix ? ` ${suffix}` : ''}
          </div>

          {subtitle ? (
            <Text
              style={{
                marginTop: 8,
                display: 'block',
                color: '#94a3b8',
                fontSize: 12,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </div>

        <div
          style={{
            minWidth: 48,
            width: 48,
            height: 48,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${accent}18`,
            color: accent,
            fontSize: 22,
            border: `1px solid ${accent}33`,
            boxShadow: `inset 0 1px 0 ${accent}22`,
          }}
        >
          {icon}
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          height: 5,
          borderRadius: 999,
          background: '#e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 999,
            background: `linear-gradient(90deg, ${accent}, ${accent}aa)`,
          }}
        />
      </div>
    </Card>
  );
}

export function SummarySplitCard({
  title,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  subtitle,
  icon,
  accent,
  leftColor = '#0f172a',
  rightColor = '#0f172a',
}: {
  title: string;
  leftLabel: string;
  leftValue: number | string;
  rightLabel: string;
  rightValue: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  accent: string;
  leftColor?: string;
  rightColor?: string;
}) {
  return (
    <Card
      variant={false}
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
        border: '1px solid #eef2f7',
        height: '100%',
      }}
      styles={{ body: { padding: 18 } }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: '#64748b',
              fontSize: 13,
              fontWeight: 500,
              display: 'block',
              marginBottom: 14,
            }}
          >
            {title}
          </Text>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              alignItems: 'start',
              minHeight: 58,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <Text
                style={{
                  color: '#64748b',
                  fontSize: 12,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                {leftLabel}
              </Text>

              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: leftColor,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                }}
              >
                {leftValue}
              </div>
            </div>

            <div style={{ minWidth: 0, textAlign: 'right' }}>
              <Text
                style={{
                  color: '#64748b',
                  fontSize: 12,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                {rightLabel}
              </Text>

              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: rightColor,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                }}
              >
                {rightValue}
              </div>
            </div>
          </div>

          <Text
            style={{
              marginTop: 12,
              display: 'block',
              color: '#94a3b8',
              fontSize: 12,
              minHeight: 18,
            }}
          >
            {subtitle || ' '}
          </Text>
        </div>

        <div
          style={{
            minWidth: 48,
            width: 48,
            height: 48,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${accent}18`,
            color: accent,
            fontSize: 22,
            border: `1px solid ${accent}33`,
            boxShadow: `inset 0 1px 0 ${accent}22`,
          }}
        >
          {icon}
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          height: 5,
          borderRadius: 999,
          background: '#e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 999,
            background: `linear-gradient(90deg, ${accent}, ${accent}aa)`,
          }}
        />
      </div>
    </Card>
  );
}