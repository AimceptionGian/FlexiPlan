import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

export default function FahrplanScreen() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const handleSearch = () => {
    // TODO: Später API Call
    console.log(`Suche von ${from} nach ${to}`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Text style={styles.label}>Start</Text>
      <TextInput
        style={styles.input}
        placeholder="z.B. Zürich HB"
        value={from}
        onChangeText={setFrom}
      />

      <Text style={styles.label}>Ziel</Text>
      <TextInput
        style={styles.input}
        placeholder="z.B. Bülach"
        value={to}
        onChangeText={setTo}
      />

      <View style={styles.buttonContainer}>
        <Button title="Verbindungen suchen" onPress={handleSearch} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  label: {
    marginTop: 12,
    fontWeight: 'bold',
    fontSize: 16,
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: 20,
  },
});
