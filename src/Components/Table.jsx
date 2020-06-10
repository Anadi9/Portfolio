import React from 'react';
import Profilepic from './../Images/Profilepic';
import Home from './../Contents/Home';

function Table(props) {
    return (
        <div>
        <table class="table">
          <tr>
            <td><Home/></td>
            <td><Profilepic/></td>
          </tr>
        </table>
        </div>
    );
}

export default Table;