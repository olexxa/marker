package com.softedge.marker.core;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.*;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

/**
 * Annotation used to import configuration
 *
 * @author <a href="mailto:me@olexxa.com">Alexey Adamov</a>
 */
@Documented
@Target({PARAMETER, METHOD, FIELD, TYPE})
@Retention(RUNTIME)
public @interface Configuration {

	String value() default "";

}
