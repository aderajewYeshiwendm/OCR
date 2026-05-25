import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Alert, Animated } from "react-native";
import { useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { uploadForOcr } from "./src/api/ocr";
import { s } from "./src/styles";
import PermissionScreen from "./src/screens/PermissionScreen";
import CameraScreen from "./src/screens/CameraScreen";
import ResultScreen from "./src/screens/ResultScreen";

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [screen, setScreen] = useState("camera");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
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
    setError(null);
    setResult(null);
    setScreen("result");

    try {
      const data = await uploadForOcr(uri);
      setResult(data);
      setStep("original");
    } catch (e) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const capture = useCallback(async () => {
    if (!camRef.current) return;
    try {
      const p = await camRef.current.takePictureAsync({ quality: 0.9 });
      processImage(p.uri);
    } catch (e) {
      Alert.alert("Capture failed", e.message);
    }
  }, [processImage]);

  const pickGallery = useCallback(async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!r.canceled && r.assets?.[0]) processImage(r.assets[0].uri);
  }, [processImage]);

  const goToCamera = useCallback(() => {
    setScreen("camera");
    setResult(null);
    setError(null);
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
      />
    );
  }

  return (
    <ResultScreen
      fadeIn={fadeIn}
      loading={loading}
      error={error}
      result={result}
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
