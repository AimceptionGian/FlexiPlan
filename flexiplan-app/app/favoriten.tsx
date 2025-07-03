import { View, Text, StyleSheet } from 'react-native';

export default function FavoritenScreen() {
    return (
        <View style={styles.container}>
            <Text>Deine Favoriten erscheinen hier.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
