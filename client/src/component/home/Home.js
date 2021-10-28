import React from "react";
import ChatSection from "./component/ChatSection";
import HeaderLeft from "./component/HeaderLeft";
import HeaderRight from "./component/HeaderRight";
import UserListPannel from "./component/UserListPannel";
import { useHistory } from "react-router-dom";

const Home = () => {
    const history = useHistory();
    if (!localStorage.getItem("token")) {
        history.push("/");
    }
    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-3">
                    <HeaderLeft />
                </div>
                <div className="col-9">
                    <HeaderRight />
                </div>
            </div>
            <div className="row">
                <div className="col-3">
                    <UserListPannel />
                </div>
                <div className="col-9">
                    <ChatSection />
                </div>
            </div>
        </div>
    );
};

export default Home;
