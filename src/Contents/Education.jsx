import React from 'react';

function Education(props) {
    return (
        <React.Fragment>
          <h1 className="text-success">Education</h1>
          <table className="table table-md">
            <thead className="thead-light">
               <tr>
                 <th scope="col">Degree</th>
                 <th scope="col">Institute</th>
                 <th scope="col">Session</th>
               </tr>
            </thead>
            <tbody>
            <tr>
            <td className="text-white">Bachelor in Computer Application</td>
            <td className="text-white">Graphic Era University</td>
            <td className="text-white">2019-22</td>
          </tr>
          <tr>
            <td className="text-white">XII Standard</td>
            <td className="text-white">M.M. Public School</td>
            <td className="text-white">2017-18</td>
          </tr>
            </tbody>
          </table>
        </React.Fragment>
    );
}

export default Education;