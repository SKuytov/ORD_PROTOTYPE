import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, TextInput, Pressable
} from 'react-native';
import { COLORS, ORDER_STATUSES, PRIORITIES, BUILDINGS } from '../constants';
import { OrderFilters } from '../api/orders';

interface Props {
  visible: boolean;
  onClose: () => void;
  filters: OrderFilters;
  onApply: (filters: OrderFilters) => void;
  role?: string;
}

const SORT_OPTIONS = [
  { value: 'id_desc', label: '↓ Newest ID First' },
  { value: 'id_asc', label: '↑ Oldest ID First' },
  { value: 'date_desc', label: '↓ Submitted Newest' },
  { value: 'date_asc', label: '↑ Submitted Oldest' },
  { value: 'priority', label: '🔴 By Priority' },
  { value: 'due_date', label: '📅 By Due Date' },
];

function ChipGroup({
  label, options, value, onSelect, multi = false,
}: {
  label: string;
  options: string[];
  value: string | undefined;
  onSelect: (v: string) => void;
  multi?: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.chips}>
        <TouchableOpacity
          style={[styles.chip, !value && styles.chipActive]}
          onPress={() => onSelect('')}
        >
          <Text style={[styles.chipText, !value && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, value === opt && styles.chipActive]}
            onPress={() => onSelect(value === opt ? '' : opt)}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function FilterSheet({ visible, onClose, filters, onApply, role }: Props) {
  const [local, setLocal] = useState<OrderFilters>(filters);

  const set = (key: keyof OrderFilters, val: string) => {
    setLocal(prev => ({ ...prev, [key]: val || undefined }));
  };

  const resetAll = () => {
    setLocal({ sort: 'id_desc' });
  };

  const activeCount = [
    local.status, local.building, local.priority,
    local.date_from, local.date_to, local.assigned_filter,
  ].filter(Boolean).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Filters & Sort</Text>
            {activeCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={resetAll}>
            <Text style={styles.reset}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Sort */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Sort By</Text>
            <View style={styles.chips}>
              {SORT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, local.sort === opt.value && styles.chipActive]}
                  onPress={() => set('sort', local.sort === opt.value ? '' : opt.value)}
                >
                  <Text style={[styles.chipText, local.sort === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status */}
          <ChipGroup
            label="Status"
            options={ORDER_STATUSES}
            value={local.status}
            onSelect={(v) => set('status', v)}
          />

          {/* Priority */}
          <ChipGroup
            label="Priority"
            options={PRIORITIES}
            value={local.priority}
            onSelect={(v) => set('priority', v)}
          />

          {/* Building */}
          <ChipGroup
            label="Building / Department"
            options={BUILDINGS}
            value={local.building}
            onSelect={(v) => set('building', v)}
          />

          {/* Date range */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Date Requested</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>From</Text>
                <TextInput
                  style={styles.dateInput}
                  value={local.date_from || ''}
                  onChangeText={(v) => set('date_from', v)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>To</Text>
                <TextInput
                  style={styles.dateInput}
                  value={local.date_to || ''}
                  onChangeText={(v) => set('date_to', v)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
          </View>

          {/* Assignment filter for procurement/admin */}
          {(role === 'procurement' || role === 'admin') && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Assignment</Text>
              <View style={styles.chips}>
                {[
                  { value: '', label: 'All Orders' },
                  { value: 'mine', label: 'My Orders' },
                  { value: 'unassigned', label: 'Unassigned' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, local.assigned_filter === opt.value && styles.chipActive]}
                    onPress={() => set('assigned_filter', local.assigned_filter === opt.value ? '' : opt.value)}
                  >
                    <Text style={[styles.chipText, local.assigned_filter === opt.value && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Apply button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => { onApply(local); onClose(); }}
          >
            <Text style={styles.applyText}>
              Apply Filters{activeCount > 0 ? ` (${activeCount} active)` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  cancel: {
    fontSize: 15,
    color: COLORS.textMuted,
  },
  reset: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  scroll: {
    paddingVertical: 12,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '40',
  },
  sectionLabel: {
    fontSize: 12,
    color: COLORS.textDim,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceHigh,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary + '30',
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
    gap: 4,
  },
  dateLabel: {
    fontSize: 11,
    color: COLORS.textDim,
    fontWeight: '500',
  },
  dateInput: {
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 14,
  },
  footer: {
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  applyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
