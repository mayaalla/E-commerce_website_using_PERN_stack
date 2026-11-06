let token : string | null = null;



export const tokenStore = {
  get: () => token,
  set: (newToken: string | null) => { token = newToken; },
};


