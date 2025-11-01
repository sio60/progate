package com.kfood.kfood_be.recipes.service;

import com.google.cloud.texttospeech.v1.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.file.*;
import java.util.UUID;

@Service
public class TtsService {
    @Value("${tts.voice}") String voiceName;
    @Value("${tts.speakingRate}") double speakingRate;
    @Value("${tts.pitch}") double pitch;
    @Value("${storage.audioDir}") String audioDir;

    public String synthesizeToFile(String text) throws Exception {
        Files.createDirectories(Path.of(audioDir));
        try (TextToSpeechClient tts = TextToSpeechClient.create()) {
            var input = SynthesisInput.newBuilder().setText(text).build();
            var voice = VoiceSelectionParams.newBuilder()
                    .setLanguageCode("ko-KR")
                    .setName(voiceName).build();
            var cfg = AudioConfig.newBuilder()
                    .setAudioEncoding(AudioEncoding.MP3)
                    .setSpeakingRate(speakingRate)
                    .setPitch(pitch)
                    .build();
            var resp = tts.synthesizeSpeech(input, voice, cfg);

            String file = UUID.randomUUID().toString().substring(0,8)+".mp3";
            Path out = Path.of(audioDir, file);
            Files.write(out, resp.getAudioContent().toByteArray());
            return "/static/audio/" + file;
        }
    }
}
