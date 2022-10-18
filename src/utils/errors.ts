/*
 * Copyright © 2022 NowSecure Inc.
 *
 * SPDX-License-Identifier: MIT
 */

/** base class for custom errors, sets the Error.name field to the constructor's name */
export class CustomError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Generic custom errors

/** Not a valid value for the field */
export class ValueError extends CustomError {}

/** Missing or unknown key in object */
export class KeyError extends CustomError {}
