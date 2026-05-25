import React, { useState, useCallback } from "react";
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
import { exportDocx } from "../api/ocr";

export default function ResultScreen({
  fadeIn,
  loading,
  progress,
  error,
  result,
  selectedPage,
  onSelectPage,
  step,
  onStepChange,
  onBack,
  onRetry,
}) {
  const [exporting, setExporting] = useState(false);
  const [textView, setTextView] = useState("combined");

  const isBatch = result?.mode === "batch";
  const activePage = isBatch
    ? result.pages?.find((p) => p.page === selectedPage) ?? result.pages?.[0]
    : null;

  const displayText = isBatch
    ? textView === "combined"
      ? result.combined_text
      : activePage?.extracted_text ?? ""
    : result?.extracted_text ?? "";

  const wordCount = isBatch ? result.total_word_count : result?.word_count;
  const activeStep = STEPS.find((st) => st.key === step);
  const b64 = result?.pipeline_images?.[step];
  const imgUri = b64 ? `data:image/jpeg;base64,${b64}` : null;

  const handleExportWord = useCallback(async () => {
    if (!result) return;
    const pages = isBatch
      ? result.pages.map((p) => ({ page: p.page, extracted_text: p.extracted_text }))
      : [{ page: 1, extracted_text: result.extracted_text }];

    const hasText = pages.some((p) => (p.extracted_text || "").trim());
    if (!hasText) {
      Alert.alert("No text", "Run OCR on at least one page with readable text first.");
      return;
    }

    setExporting(true);
    try {
      const { docx_base64, filename } = await exportDocx({
        title: "Amharic Journal OCR",
        pages,
      });
      const { shareDocxFromBase64 } = await import("../utils/docxShare");
      await shareDocxFromBase64(docx_base64, filename);
    } catch (e) {
      Alert.alert("Export failed", e.message || "Could not create Word file");
    } finally {
      setExporting(false);
    }
  }, [result, isBatch]);

  const loadLabel = progress
    ? `Processing page ${progress.current} of ${progress.total}…`
    : "Running Amharic OCR pipeline…";

  return (
    <SafeAreaView style={s.resultRoot}>
      <StatusBar barStyle="light-content" />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {isBatch ? `Journal · ${result?.page_count ?? 0} pages` : "OCR Pipeline"}
        </Text>
        <View style={{ width: 64 }} />
      </View>

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeIn }}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={s.card}>
            <ActivityIndicator size="large" color="#4A9EFF" />
            <Text style={s.loadTxt}>{loadLabel}</Text>
            <Text style={s.loadSub}>Canny → Contour → Warp → Threshold → Tesseract (amh)</Text>
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
              <Stat icon="🔤" label="Words" value={wordCount ?? 0} color="#4A9EFF" />
              <Stat
                icon="🎯"
                label="Confidence"
                value={`${result.avg_confidence ?? 0}%`}
                color="#B15DFF"
              />
            </View>

            {result.ocr_lang && (
              <Text style={s.langBadge}>OCR: {result.ocr_lang}</Text>
            )}

            {isBatch && (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 10 }}
                  contentContainerStyle={s.pageTabs}
                >
                  {result.pages.map((p) => (
                    <TouchableOpacity
                      key={p.page}
                      style={[s.pageTab, selectedPage === p.page && s.pageTabActive]}
                      onPress={() => onSelectPage(p.page)}
                    >
                      <Text
                        style={[
                          s.pageTabTxt,
                          selectedPage === p.page && s.pageTabTxtActive,
                        ]}
                      >
                        ገጽ {p.page}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={s.textToggleRow}>
                  <TouchableOpacity
                    style={[s.textToggle, textView === "combined" && s.textToggleActive]}
                    onPress={() => setTextView("combined")}
                  >
                    <Text
                      style={[
                        s.textToggleTxt,
                        textView === "combined" && s.textToggleTxtActive,
                      ]}
                    >
                      All pages
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.textToggle, textView === "page" && s.textToggleActive]}
                    onPress={() => setTextView("page")}
                  >
                    <Text
                      style={[
                        s.textToggleTxt,
                        textView === "page" && s.textToggleTxtActive,
                      ]}
                    >
                      Page {selectedPage}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

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
                {activeStep?.icon} {activeStep?.label}
                {isBatch ? " (page 1 preview)" : ""}
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
                <Text style={s.txtTitle}>📄 Extracted Text (Amharic)</Text>
                <View style={s.txtActions}>
                  <TouchableOpacity
                    onPress={async () => {
                      await Clipboard.setStringAsync(displayText || "");
                      Alert.alert("Copied!");
                    }}
                  >
                    <Text style={s.actionLink}>Copy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleExportWord} disabled={exporting}>
                    <Text style={[s.actionLink, exporting && { opacity: 0.5 }]}>
                      {exporting ? "Word…" : "Word"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView style={{ maxHeight: 260, padding: 16 }} nestedScrollEnabled>
                <Text style={s.txtBodyAmharic}>
                  {displayText?.trim() ||
                    "(No text detected — use good lighting and printed Amharic when possible)"}
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
