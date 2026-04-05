import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { createOrder, getBuildings, getCostCenters, getAutocomplete, Building, CostCenter } from '../../src/api/orders';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, PRIORITIES } from '../../src/constants';

interface AttachedFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

function ChipSelect({ label, options, value, onSelect, required }: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
  required?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, value === opt.value && styles.chipActive]}
            onPress={() => onSelect(opt.value)}
          >
            <Text style={[styles.chipText, value === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default function NewOrderModal() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [autocomplete, setAutocomplete] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  // Form state
  const [building, setBuilding] = useState('');
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

  // Load buildings and cost centers from the real API
  useEffect(() => {
    getBuildings().then(data => {
      setBuildings(data);
      // Auto-select user's building if it matches
      if (user?.building && data.length > 0) {
        const match = data.find(b => b.name === user.building || b.code === user.building);
        if (match) setBuilding(match.name);
        else setBuilding(data[0].name);
      } else if (data.length > 0) {
        setBuilding(data[0].name);
      }
    }).catch(() => {});

    getCostCenters().then(data => setCostCenters(data)).catch(() => {});
  }, []);

  // Autocomplete on item description
  useEffect(() => {
    if (itemDescription.length < 2) { setAutocomplete([]); return; }
    const t = setTimeout(async () => {
      const suggestions = await getAutocomplete(itemDescription);
      setAutocomplete(suggestions);
    }, 350);
    return () => clearTimeout(t);
  }, [itemDescription]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const newFiles: AttachedFile[] = result.assets.map(a => ({
        uri: a.uri,
        name: a.fileName ?? a.uri.split('/').pop() ?? 'photo.jpg',
        type: a.mimeType ?? 'image/jpeg',
        size: a.fileSize,
      }));
      setAttachedFiles(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setAttachedFiles(prev => [...prev, {
        uri: a.uri,
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
        size: a.fileSize,
      }].slice(0, 5));
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: true,
    });
    if (!result.canceled && result.assets) {
      const newFiles: AttachedFile[] = result.assets.map(a => ({
        uri: a.uri,
        name: a.name,
        type: a.mimeType ?? 'application/octet-stream',
        size: a.size,
      }));
      setAttachedFiles(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeFile = (idx: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const fileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('docx')) return '📝';
    if (type.includes('excel') || type.includes('xlsx')) return '📊';
    return '📎';
  };

  const handleSubmit = async () => {
    if (!itemDescription.trim()) {
      Alert.alert('Required', 'Please enter an item description.'); return;
    }
    if (!building) {
      Alert.alert('Required', 'Please select a building.'); return;
    }
    if (!dateNeeded.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid date', 'Use format YYYY-MM-DD'); return;
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
        files: attachedFiles.length > 0 ? attachedFiles : undefined,
      });

      Alert.alert(
        '✅ Order Submitted',
        `Order #${res.orderId} created successfully.`,
        [
          { text: 'View Order', onPress: () => { router.dismiss(); router.push(`/order/${res.orderId}`); } },
          { text: 'New Order', onPress: () => {
            setItemDescription(''); setPartNumber(''); setCategory('');
            setQuantity('1'); setNotes(''); setCostCenterId(''); setAttachedFiles([]);
          }},
          { text: 'Close', onPress: () => router.dismiss() },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const buildingOptions = buildings.map(b => ({ value: b.name, label: b.name }));
  const priorityOptions = PRIORITIES.map(p => ({ value: p, label: p }));

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
            style={[styles.input, styles.textarea]}
            value={itemDescription}
            onChangeText={setItemDescription}
            placeholder="Describe what you need (e.g. V-belt, bearing, motor...)..."
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
                  <Text style={styles.autocompleteText}>📋 {s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Building — from real API */}
        {buildingOptions.length > 0 ? (
          <ChipSelect
            label="Building / Department"
            options={buildingOptions}
            value={building}
            onSelect={setBuilding}
            required
          />
        ) : (
          <View style={styles.field}>
            <Text style={styles.label}>Building / Department *</Text>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        )}

        {/* Priority */}
        <ChipSelect
          label="Priority"
          options={priorityOptions}
          value={priority}
          onSelect={setPriority}
        />

        {/* Quantity & Date */}
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
          <View style={[styles.field, { flex: 1.6 }]}>
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

        {/* Cost Center — from real API */}
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
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* File Attachments */}
        <View style={styles.field}>
          <Text style={styles.label}>Attachments ({attachedFiles.length}/5)</Text>

          {/* Attachment buttons */}
          <View style={styles.attachRow}>
            <TouchableOpacity style={styles.attachBtn} onPress={takePhoto}>
              <Text style={styles.attachBtnIcon}>📷</Text>
              <Text style={styles.attachBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
              <Text style={styles.attachBtnIcon}>🖼</Text>
              <Text style={styles.attachBtnText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachBtn} onPress={pickDocument}>
              <Text style={styles.attachBtnIcon}>📁</Text>
              <Text style={styles.attachBtnText}>File</Text>
            </TouchableOpacity>
          </View>

          {/* Attached file list */}
          {attachedFiles.length > 0 && (
            <View style={styles.fileList}>
              {attachedFiles.map((f, i) => (
                <View key={i} style={styles.fileItem}>
                  {f.type.startsWith('image/') ? (
                    <Image source={{ uri: f.uri }} style={styles.fileThumb} />
                  ) : (
                    <Text style={styles.fileItemIcon}>{fileIcon(f.type)}</Text>
                  )}
                  <Text style={styles.fileItemName} numberOfLines={1}>{f.name}</Text>
                  {f.size && (
                    <Text style={styles.fileItemSize}>{Math.round(f.size / 1024)}KB</Text>
                  )}
                  <TouchableOpacity onPress={() => removeFile(i)} style={styles.fileRemove}>
                    <Text style={styles.fileRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <Text style={styles.summaryLine}>📦 {itemDescription || '—'}</Text>
          <Text style={styles.summaryLine}>🏭 {building || '—'} · Qty {quantity}</Text>
          <Text style={styles.summaryLine}>📅 Needed by {dateNeeded}</Text>
          <Text style={styles.summaryLine}>⚡ {priority} priority · By {user?.name}</Text>
          {attachedFiles.length > 0 && (
            <Text style={styles.summaryLine}>📎 {attachedFiles.length} file(s) attached</Text>
          )}
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
  scroll: { padding: 20, paddingBottom: 60 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  pageSub: { fontSize: 13, color: COLORS.textMuted, marginBottom: 16 },
  field: { marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  label: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 12,
    color: COLORS.text, fontSize: 14,
  },
  textarea: { minHeight: 76 },
  autocomplete: {
    backgroundColor: COLORS.surfaceHigh, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, marginTop: 4, overflow: 'hidden',
  },
  autocompleteItem: {
    padding: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border + '50',
  },
  autocompleteText: { fontSize: 13, color: COLORS.text },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  chipActive: { backgroundColor: COLORS.primary + '25', borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  chipTextActive: { color: COLORS.primary, fontWeight: '700' },
  attachRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  attachBtn: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, padding: 12, alignItems: 'center', gap: 4,
  },
  attachBtnIcon: { fontSize: 22 },
  attachBtnText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  fileList: { gap: 6 },
  fileItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  fileThumb: { width: 36, height: 36, borderRadius: 4 },
  fileItemIcon: { fontSize: 24, width: 36, textAlign: 'center' },
  fileItemName: { flex: 1, fontSize: 12, color: COLORS.text },
  fileItemSize: { fontSize: 10, color: COLORS.textDim },
  fileRemove: { padding: 4 },
  fileRemoveText: { fontSize: 14, color: COLORS.error },
  summaryCard: {
    backgroundColor: COLORS.navy + 'CC', borderRadius: 12, padding: 14, gap: 4,
    borderWidth: 1, borderColor: COLORS.navyLight + '40', marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 11, fontWeight: '700', color: COLORS.textDim,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4,
  },
  summaryLine: { fontSize: 13, color: COLORS.text },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 10,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelText: { color: COLORS.textMuted, fontSize: 14 },
});
