import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { VitalRecord } from '@anesthesia/core';

interface VitalChartProps {
  records: VitalRecord[];
  title: string;
  dataKey: keyof VitalRecord;
  color: string;
  unit: string;
}

const screenWidth = Dimensions.get('window').width;

export default function VitalChart({
  records,
  title,
  dataKey,
  color,
  unit,
}: VitalChartProps) {
  // 過濾掉該欄位為空值或無效值的記錄
  const validRecords = records.filter((r) => {
    const value = r[dataKey];
    if (value === null || value === undefined || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && isFinite(num);
  });

  if (validRecords.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.noData}>無資料</Text>
      </View>
    );
  }

  const data = validRecords.map((r) => Number(r[dataKey]));
  const labels = validRecords.map((r, index) => {
    if (validRecords.length <= 6 || index % Math.ceil(validRecords.length / 6) === 0) {
      const date = new Date(r.timestamp);
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return '';
  });

  const chartData = {
    labels: labels,
    datasets: [
      {
        data: data,
        color: () => color,
        strokeWidth: 2,
      },
    ],
  };

  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const padding = (maxValue - minValue) * 0.1 || 10;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {title} ({unit})
      </Text>
      <LineChart
        data={chartData}
        width={screenWidth - 32}
        height={180}
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          decimalPlaces: 1,
          color: () => color,
          labelColor: () => '#666',
          style: {
            borderRadius: 8,
          },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: color,
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: '#eee',
          },
        }}
        bezier
        style={styles.chart}
        fromZero={false}
        yAxisSuffix=""
        yAxisInterval={1}
        withInnerLines={true}
        withOuterLines={true}
        withVerticalLines={false}
        withHorizontalLines={true}
        withDots={validRecords.length <= 20}
        withShadow={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  chart: {
    borderRadius: 8,
    marginLeft: -16,
  },
  noData: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 40,
  },
});
