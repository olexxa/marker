package com.softedge.marker.core;

import javax.ws.rs.ext.ExceptionMapper;
import javax.ws.rs.ext.Provider;
import javax.ws.rs.core.Response;

/**
 * @author <a href="mailto:me@olexxa.com">Alexey Adamov</a>
 */
@Provider
public class ErrorMapper implements ExceptionMapper<Throwable> {

    @Override
    public Response toResponse(Throwable error) {
        return Response
            .status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(error.getMessage())
            .type("text/plain")
            .build();
    }

}