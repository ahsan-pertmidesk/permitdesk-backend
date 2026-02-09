
enum Role {
  Admin ,
  Client,
  Coach,
}

export default interface User {
  id: number;
  email: string;
  password: string;
  role: Role; 
  accessToken: string[];
  refreshToken: string;
  createdAt: Date;
  updatedAt: Date;
}
