export type RootStackParamList = {
    Onboarding: undefined;
    Login: undefined;
    Register: { role: 'client' | 'driver' };
    Home: undefined;
    History: undefined;
    HistoryDetail: { rideId: string };
};
