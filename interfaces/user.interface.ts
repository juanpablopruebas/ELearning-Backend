export interface IRegistrationUser {
  name: string;
  email: string;
  password: string;
}

export interface IActivationUser {
  activation_token: string;
  activation_code: string;
}

export interface ILoginUser {
  email: string;
  password: string;
}

export interface ISocialAuthUser {
  email: string;
  name: string;
  avatar: string;
}

export interface IUpdateUser {
  email?: string;
  name?: string;
}

export interface IUpdateUserPassword {
    oldPassword: string;
    newPassword: string;
  }
