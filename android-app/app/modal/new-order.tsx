import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { router } from 'expo-router';
import { createOrder } from '../../src/api/orders';
import { apiClient } from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, BUILDINGS, PRIORITIES } from '../../src/constants';

interface CostCenter { id: number; code: string; name: string; }

function ChipSelect({
  label, options, value, onSelect, required,
}: {
  label: string; options: string[]; value: string; onSelect: (v: string) => void; required?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, value === opt && styles.chipActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default function NewOrderModal() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);

  // Form state
  const [building, setBuilding] = useState(user?.building ?? BUILDINGS[0]);
  const [itemDescription, setItemDescription] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [dateNeeded, setDateNeeded] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [priority, setPriority] = useState('Normal');
  const [notes, setNotes] = useState('');
  const [costCenterId, setCostCenterId] = useState<string>('');
  const [autocomplete, setAutocomplete] = useState<string[]>([]);

  useEffect(() => {
    apiClient.get<{ success: boolean; cost_centers: CostCenter[] }>('/cost-centers')
      .then(res => setCostCenters(res.cost_centers || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (itemDescription.length < 2) { setAutocomplete([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await apiClient.get<{ success: boolean; suggestions: string[] }>(
          `/autocomplete/item-description?q=${encodeURIComponent(itemDescription)}`
        );
        setAutocomplete(res.suggestions?.slice(0, 5) ?? []);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [itemDescription]);

  const handleSubmit = async () => {
    if (!itemDescription.trim()) {
      Alert.alert('Required', 'Please enter an item description.'); return;
    }
    if (!building) {
      Alert.alert('Required', 'Please select a building.'); return;
    }
    if (!dateNeeded.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid', 'Date must be in YYYY-MM-DD format.'); return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      Alert.alert('Invalid', 'Quantity must be at least 1.'); return;
    }

    setLoading(true);
    try {
      const res = await createOrder({
        building,
        itemDescription: itemDescription.trim(),
        partNumber: partNumber.trim() || undefined,
        category: category.trim() || undefined,
        quantity: qty,
        dateNeeded,
        priority,
        notes: notes.trim() || undefined,
        requester: user?.name ?? user?.username ?? 'Unknown',
        requesterEmail: user?.email,
        costCenterId: costCenterId ? parseInt(costCenterId, 10) : undefined,
      });

      Alert.alert(
        '✅ Order Created',
        `Your order #${res.orderId} has been submitted successfully.`,
        [
          {
            text: 'View Order',
            onPress: () => {
              router.dismiss();
              router.push(`/order/${res.orderId}`);
            },
          },
          {
            text: 'Close',
            onPress: () => router.dismiss(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>New Order Request</Text>
        <Text style={styles.pageSub}>Fill in the details for your procurement request</Text>

        {/* Item Description with autocomplete */}
        <View style={styles.field}>
          <Text style={styles.label}>Item Description *</Text>
          <TextInput
            style={styles.input}
            value={itemDescription}
            onChangeText={setItemDescription}
            placeholder="What do you need? e.g. Conveyor belt V-belt..."
            placeholderTextColor={COLORS.textDim}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          {autocomplete.length > 0 && (
            <View style={styles.autocomplete}>
              {autocomplete.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.autocompleteItem}
                  onPress={() => { setItemDescription(s); setAutocomplete([]); }}
                >
                  <Text style={styles.autocompleteText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Building */}
        <ChipSelect
          label="Building / Department"
          options={BUILDINGS}
          value={building}
          onSelect={setBuilding}
          required
        />

        {/* Priority */}
        <ChipSelect
          label="Priority"
          options={PRIORITIES}
          value={priority}
          onSelect={setPriority}
        />

        {/* Quantity */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={COLORS.textDim}
            />
          </View>
          <View style={[styles.field, { flex: 1.5 }]}>
            <Text style={styles.label}>Date Needed *</Text>
            <TextInput
              style={styles.input}
              value={dateNeeded}
              onChangeText={setDateNeeded}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textDim}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        {/* Part Number & Category */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Part Number</Text>
            <TextInput
              style={styles.input}
              value={partNumber}
              onChangeText={setPartNumber}
              placeholder="Optional"
              placeholderTextColor={COLORS.textDim}
              autoCapitalize="characters"
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="Optional"
              placeholderTextColor={COLORS.textDim}
            />
          </View>
        </View>

        {/* Cost Center */}
        {costCenters.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Cost Center</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, !costCenterId && styles.chipActive]}
                onPress={() => setCostCenterId('')}
              >
                <Text style={[styles.chipText, !costCenterId && styles.chipTextActive]}>None</Text>
              </TouchableOpacity>
              {costCenters.map(cc => (
                <TouchableOpacity
                  key={cc.id}
                  style={[styles.chip, costCenterId === String(cc.id) && styles.chipActive]}
                  onPress={() => setCostCenterId(String(cc.id))}
                >
                  <Text style={[styles.chipText, costCenterId === String(cc.id) && styles.chipTextActive]}>
                    {cc.code} – {cc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional details, links, specifications..."
            placeholderTextColor={COLORS.textDim}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <Text style={styles.summaryLine}>📦 {itemDescription || '—'}</Text>
          <Text style={styles.summaryLine}>🏭 {building} · Qty {quantity}</Text>
          <Text style={styles.summaryLine}>📅 Needed by {dateNeeded}</Text>
          <Text style={styles.summaryLine}>
            ⚡ Priority: {priority} · By {user?.name}
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit Order Request</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.dismiss()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 60,
    gap: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
  },
  textarea: {
    minHeight: 80,
  },
  autocomplete: {
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  autocompleteItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '60',
  },
  autocompleteText: {
    fontSize: 13,
    color: COLORS.text,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipActive: {
    backgroundColor: COLORS.primary + '25',
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
  summaryCard: {
    backgroundColor: COLORS.navy + 'CC',
    borderRadius: 12,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.navyLight + '40',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  summaryLine: {
    fontSize: 13,
    color: COLORS.text,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
