import React, { Component } from "react";
import { Overview } from "./Overview";

export class Home extends Component {
  static displayName = Home.name;

  render() {
    return <Overview />;
  }
}
