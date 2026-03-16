export type MainTabParamList = {
    Home: { acceptedRide?: any; acceptedDriver?: any } | undefined;
    History: undefined;
    Wallet: undefined;
    Profile: undefined;
};

export type RootStackParamList = {
    Onboarding: undefined;
    Login: undefined;
    Register: { role: 'client' | 'driver' };
    MainTabs: undefined;
    Home: { acceptedRide?: any; acceptedDriver?: any } | undefined;
    History: undefined;
    HistoryDetail: { rideId: string };
    Wallet: undefined;
    Profile: undefined;
};
