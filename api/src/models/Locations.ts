export type ICoordinate = {
    lat: number;
    lng: number;
};

export type ILocation = {
    createdAt: string;
    id: string;
    timestamp: string;
    location: ICoordinate;
    userId: string;
};
