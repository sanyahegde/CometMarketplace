import logo from '../assets/cmlogo.png';
import { Button } from '@mantine/core';
import { useAuth0 } from '@auth0/auth0-react';

export default function Login() {
  const { loginWithRedirect } = useAuth0();
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="flex flex-col space-y-10 justify-center items-center shadow-lg border-2 border-gray-200 p-4 rounded-lg">
        <img
          src={logo}
          style={{ width: 300, borderRadius: '10%' }}
          draggable="false"
        />
        <div className="flex space-x-10">
          <Button color="orange" onClick={() => loginWithRedirect()}>
            Login
          </Button>
          <Button
            color="orange"
            variant="outline"
            onClick={() =>
              loginWithRedirect({
                authorizationParams: {
                  screen_hint: 'signup',
                },
              })
            }
          >
            Sign Up
          </Button>
        </div>
      </div>
    </div>
  );
}
