import { View, Text, FlatList, TouchableOpacity } from "react-native";
import companions from "/src/components/companions";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>
        Choose Your Companion
      </Text>

      <FlatList
        data={companions}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/session",
                params: { name: item.name },
              })
            }
            style={{
              padding: 16,
              backgroundColor: "#222",
              marginTop: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "white", fontSize: 18 }}>{item.name}</Text>
            <Text style={{ color: "#aaa" }}>{item.role}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
