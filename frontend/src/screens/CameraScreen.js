import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView } from "expo-camera";
import { s } from "../styles";

export default function CameraScreen({
  camRef,
  facing,
  flash,
  pulse,
  onToggleFlash,
  onToggleFacing,
  onCapture,
  onPickGallery,
  onPickJournal,
  onProcessJournalUris,
}) {
  const [journalMode, setJournalMode] = useState(false);
  const [shots, setShots] = useState([]);

  const handlePress = useCallback(async () => {
    if (!journalMode) {
      onCapture();
      return;
    }
    if (!camRef.current) return;
    try {
      const p = await camRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: false,
        exif: false,
      });
      setShots((prev) => [...prev, p.uri]);
    } catch (e) {
      Alert.alert("Capture failed", e.message);
    }
  }, [journalMode, camRef, onCapture]);

  const handleDone = useCallback(() => {
    if (!shots.length) return;
    const uris = shots;
    setShots([]);
    setJournalMode(false);
    onProcessJournalUris(uris);
  }, [shots, onProcessJournalUris]);

  const handleUndo = useCallback(() => {
    setShots((prev) => prev.slice(0, -1));
  }, []);

  const handleCancelJournal = useCallback(() => {
    setShots([]);
    setJournalMode(false);
  }, []);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <CameraView
        ref={camRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash ? "on" : "off"}
      />

      <View style={s.frame} pointerEvents="none">
        {[s.cTL, s.cTR, s.cBL, s.cBR].map((cs, i) => (
          <View key={i} style={cs} />
        ))}
        <Text style={s.frameHint}>
          {journalMode
            ? `Capture page ${shots.length + 1} — tap shutter to add`
            : "Align journal page within frame"}
        </Text>
      </View>

      <SafeAreaView style={s.topBar}>
        <Text style={s.appName}>ኦማር · OCR</Text>
        <View style={s.topBtns}>
          <TouchableOpacity style={s.iconBtn} onPress={onToggleFlash}>
            <Text style={s.iconBtnTxt}>{flash ? "⚡" : "🔦"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={onToggleFacing}>
            <Text style={s.iconBtnTxt}>🔄</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {journalMode && (
        <View style={s.journalBar} pointerEvents="box-none">
          <View style={s.journalHeader}>
            <Text style={s.journalTitle}>
              📓 Journal · {shots.length} page{shots.length === 1 ? "" : "s"}
            </Text>
            <TouchableOpacity onPress={handleCancelJournal}>
              <Text style={s.journalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.journalThumbs}
          >
            {shots.map((uri, idx) => (
              <View key={`${uri}-${idx}`} style={s.journalThumb}>
                <Image source={{ uri }} style={s.journalThumbImg} />
                <Text style={s.journalThumbIdx}>{idx + 1}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={s.bottomBar}>
        <View style={s.sideActions}>
          {journalMode ? (
            <TouchableOpacity
              style={s.gallBtn}
              onPress={handleUndo}
              disabled={!shots.length}
            >
              <Text style={{ fontSize: 22, opacity: shots.length ? 1 : 0.3 }}>
                ↩️
              </Text>
              <Text style={s.gallTxt}>Undo</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={s.gallBtn} onPress={onPickGallery}>
                <Text style={{ fontSize: 22 }}>🖼️</Text>
                <Text style={s.gallTxt}>One</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.gallBtn} onPress={onPickJournal}>
                <Text style={{ fontSize: 22 }}>🗂️</Text>
                <Text style={s.gallTxt}>Gallery</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <TouchableOpacity style={s.capBtn} onPress={handlePress}>
            <View
              style={[
                s.capInner,
                journalMode && { backgroundColor: "#FFD700" },
              ]}
            />
            {journalMode && shots.length > 0 && (
              <View style={s.capBadge}>
                <Text style={s.capBadgeTxt}>{shots.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={s.sideActions}>
          {journalMode ? (
            <TouchableOpacity
              style={s.gallBtn}
              onPress={handleDone}
              disabled={!shots.length}
            >
              <Text style={{ fontSize: 22, opacity: shots.length ? 1 : 0.3 }}>
                ✅
              </Text>
              <Text style={s.gallTxt}>Done</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={s.gallBtn}
              onPress={() => setJournalMode(true)}
            >
              <Text style={{ fontSize: 22 }}>📚</Text>
              <Text style={s.gallTxt}>Journal</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
