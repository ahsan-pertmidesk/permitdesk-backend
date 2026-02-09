class ApiResponse<T> {
    status: number;
    message: string;
    success: boolean;
    data: T;
  
    constructor(status: number, message = "Success", data: T, success = true) {
      this.status = status;
      this.message = message;
      this.success = success;
      this.data = data;
    }
  }
  
  export default ApiResponse;
  