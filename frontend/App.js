import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Alert, Animated } from "react-native";
import { useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { uploadForOcr, processJournalPages } from "./src/api/ocr";
import { s } from "./src/styles";
import PermissionScreen from "./src/screens/PermissionScreen";
import CameraScreen from "./src/screens/CameraScreen";
import ResultScreen from "./src/screens/ResultScreen";

const MAX_JOURNAL_PAGES = 50;

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [screen, setScreen] = useState("camera");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [selectedPage, setSelectedPage] = useState(1);
  const [step, setStep] = useState("original");
  const [facing, setFacing] = useState("back");
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState(null);

  const camRef = useRef(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (screen === "result") {
      fadeIn.setValue(0);
      Animated.timing(fadeIn, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }
  }, [screen]);

  const processImage = useCallback(async (uri) => {
    setLoading(true);
    setProgress(null);
    setError(null);
    setResult(null);
    setSelectedPage(1);
    setScreen("result");

    try {
      const data = await uploadForOcr(uri);
      setResult({ ...data, mode: "single" });
      setStep("original");
    } catch (e) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const processJournal = useCallback(async (uris) => {
    if (!uris.length) return;
    if (uris.length > MAX_JOURNAL_PAGES) {
      Alert.alert(
        "Too many photos",
        `Please select at most ${MAX_JOURNAL_PAGES} images at once.`
      );
      return;
    }

    setLoading(true);
    setProgress({ current: 0, total: uris.length });
    setError(null);
    setResult(null);
    setSelectedPage(1);
    setScreen("result");

    try {
      const data = await processJournalPages(uris, {
        onProgress: (current, total) => setProgress({ current, total }),
      });
      setResult(data);
      setStep("original");
    } catch (e) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, []);

  const capture = useCallback(async () => {
    if (!camRef.current) return;
    try {
      const p = await camRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: false,
        exif: false,
      });
      processImage(p.uri);
    } catch (e) {
      Alert.alert("Capture failed", e.message);
    }
  }, [processImage]);

  const pickGallery = useCallback(async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsMultipleSelection: false,
      exif: false,
    });
    if (!r.canceled && r.assets?.[0]) processImage(r.assets[0].uri);
  }, [processImage]);

  const pickJournal = useCallback(async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsMultipleSelection: true,
      selectionLimit: MAX_JOURNAL_PAGES,
      exif: false,
    });
    if (!r.canceled && r.assets?.length) {
      processJournal(r.assets.map((a) => a.uri));
    }
  }, [processJournal]);

  const goToCamera = useCallback(() => {
    setScreen("camera");
    setResult(null);
    setError(null);
    setProgress(null);
    setSelectedPage(1);
  }, []);

  if (!permission) return <View style={s.root} />;
  if (!permission.granted) {
    return <PermissionScreen onRequestPermission={requestPermission} />;
  }

  if (screen === "camera") {
    return (
      <CameraScreen
        camRef={camRef}
        facing={facing}
        flash={flash}
        pulse={pulse}
        onToggleFlash={() => setFlash((f) => !f)}
        onToggleFacing={() => setFacing((f) => (f === "back" ? "front" : "back"))}
        onCapture={capture}
        onPickGallery={pickGallery}
        onPickJournal={pickJournal}
        onProcessJournalUris={processJournal}
      />
    );
  }

  return (
    <ResultScreen
      fadeIn={fadeIn}
      loading={loading}
      progress={progress}
      error={error}
      result={result}
      selectedPage={selectedPage}
      onSelectPage={setSelectedPage}
      step={step}
      onStepChange={setStep}
      onBack={goToCamera}
      onRetry={() => {
        setScreen("camera");
        setError(null);
      }}
    />
  );
}
