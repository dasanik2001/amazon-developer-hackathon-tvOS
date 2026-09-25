import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GuardianLoginScreen from '../screens/GuardianLoginScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={GuardianLoginScreen} />
    </Stack.Navigator>
  );
}

