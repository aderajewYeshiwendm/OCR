import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Animated,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { STEPS } from "../constants";
import { s } from "../styles";
import Stat from "../components/Stat";
import PipelineImage from "../components/PipelineImage";

export default function ResultScreen({
  fadeIn,
  loading,
  error,
  result,
  step,
  onStepChange,
  onBack,
  onRetry,
}) {
  const activeStep = STEPS.find((st) => st.key === step);
  const b64 = result?.pipeline_images?.[step];
  const imgUri = b64 ? `data:image/png;base64,${b64}` : null;

  return (
    <SafeAreaView style={s.resultRoot}>
      <StatusBar barStyle="light-content" />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>OCR Pipeline</Text>
        <View style={{ width: 64 }} />
      </View>

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeIn }}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={s.card}>
            <ActivityIndicator size="large" color="#4A9EFF" />
            <Text style={s.loadTxt}>Running OCR pipeline…</Text>
            <Text style={s.loadSub}>Canny → Contour → Warp → Threshold → Tesseract</Text>
          </View>
        )}

        {error && !loading && (
          <View style={[s.card, { borderColor: "#FF6B3555" }]}>
            <Text style={{ fontSize: 48 }}>⚠️</Text>
            <Text style={[s.loadTxt, { color: "#FF6B35" }]}>Pipeline Error</Text>
            <Text style={s.loadSub}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={onRetry}>
              <Text style={s.retryTxt}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {result && !loading && (
          <>
            <View style={s.statsRow}>
              <Stat
                icon={result.doc_detected ? "✅" : "❌"}
                label="Document"
                value={result.doc_detected ? "Found" : "None"}
                color={result.doc_detected ? "#00D68F" : "#FF6B35"}
              />
              <Stat icon="🔤" label="Words" value={result.word_count} color="#4A9EFF" />
              <Stat
                icon="🎯"
                label="Confidence"
                value={`${result.avg_confidence}%`}
                color="#B15DFF"
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 14 }}
              contentContainerStyle={s.tabs}
            >
              {STEPS.map((st) => (
                <TouchableOpacity
                  key={st.key}
                  style={[
                    s.tab,
                    step === st.key && {
                      backgroundColor: st.color + "22",
                      borderColor: st.color,
                    },
                  ]}
                  onPress={() => onStepChange(st.key)}
                >
                  <Text style={s.tabIcon}>{st.icon}</Text>
                  <Text style={[s.tabLabel, step === st.key && { color: st.color }]}>
                    {st.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={s.imgCard}>
              <Text style={[s.imgCardTitle, { color: activeStep?.color }]}>
                {activeStep?.icon}  {activeStep?.label}
              </Text>
              {imgUri ? (
                <PipelineImage uri={imgUri} />
              ) : (
                <View style={s.noImg}>
                  <Text style={{ color: "#6B7A8D" }}>No image for this step</Text>
                </View>
              )}
            </View>

            <View style={s.txtCard}>
              <View style={s.txtHeader}>
                <Text style={s.txtTitle}>📄 Extracted Text</Text>
                <TouchableOpacity
                  onPress={async () => {
                    await Clipboard.setStringAsync(result.extracted_text || "");
                    Alert.alert("Copied!");
                  }}
                >
                  <Text style={{ color: "#4A9EFF", fontWeight: "700" }}>Copy</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 220, padding: 16 }} nestedScrollEnabled>
                <Text style={s.txtBody}>
                  {result.extracted_text?.trim() ||
                    "(No text detected — try better lighting or hold camera steady)"}
                </Text>
              </ScrollView>
            </View>

            <View style={s.flowCard}>
              <Text style={s.flowTitle}>PIPELINE FLOW</Text>
              <View style={s.flowRow}>
                {STEPS.map((st, i) => (
                  <React.Fragment key={st.key}>
                    <TouchableOpacity
                      style={[s.flowStep, { borderColor: st.color }]}
                      onPress={() => onStepChange(st.key)}
                    >
                      <Text style={{ fontSize: 16 }}>{st.icon}</Text>
                      <Text style={[s.flowLabel, { color: st.color }]}>{st.label}</Text>
                    </TouchableOpacity>
                    {i < STEPS.length - 1 && <Text style={s.arrow}>→</Text>}
                  </React.Fragment>
                ))}
              </View>
            </View>

            <View style={{ height: 40 }} />
          </>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
