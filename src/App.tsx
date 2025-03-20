import Main from "component/Main";
import { Switch, Route } from "react-router-dom";
import "./App.css";
import { MessageProvider } from "component/MessageContext";
import { SerialProvider } from "context/SerialContext";
import { AppStateProvider } from "context/AppStateContext";
import { FileInputProvider } from "context/FileInputContext";
import { LoadingProvider } from "context/LoadingContext";

const App = () => {
  return (
    <MessageProvider>
      <LoadingProvider delay={100}> {/* 100ms 지연 설정 */}
        <AppStateProvider>
          <FileInputProvider>
            <Switch>
              <Route path="/" exact>
                <SerialProvider>
                  <Main />
                </SerialProvider>
              </Route>
            </Switch>
          </FileInputProvider>
        </AppStateProvider>
      </LoadingProvider>
    </MessageProvider>
  );
};

export default App;
